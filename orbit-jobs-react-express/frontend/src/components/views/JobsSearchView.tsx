/**
 * Job search UI — filters, facet counts, chips, URL-encoded state, sort,
 * load-more, skeletons, empty state. First page arrives server-rendered
 * (props), then behaves exactly like the original client experience.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { MODEL_NAMES, PAGE_SIZE, SEN_NAMES, SPEC_NAMES, TYPE_NAMES, mhref } from "@/lib/taxonomy";
import type { Market, PublicJob, SearchResult } from "@/lib/types";
import { JobCard, Skeletons } from "@/components/JobCard";
import { IconChevD } from "@/lib/icons";
import { useUser } from "@/components/providers";

export interface SearchState {
  q: string; loc: string;
  type: string[]; specialism: string[]; industry: string[]; seniority: string[]; workModel: string[];
  salaryMin: string; salaryMax: string;
  disclosedOnly: boolean; visa: boolean;
  posted: string; source: string; sort: string;
}

export function emptyState(sort = "recent"): SearchState {
  return { q: "", loc: "", type: [], specialism: [], industry: [], seniority: [], workModel: [], salaryMin: "", salaryMax: "", disclosedOnly: false, visa: false, posted: "", source: "", sort };
}

function stateToParams(s: SearchState, extra?: Record<string, string>): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.loc) p.set("loc", s.loc);
  (["type", "specialism", "industry", "seniority", "workModel"] as const).forEach((k) => { if (s[k].length) p.set(k, s[k].join(",")); });
  if (s.salaryMin) p.set("salaryMin", s.salaryMin);
  if (s.salaryMax) p.set("salaryMax", s.salaryMax);
  if (s.disclosedOnly) p.set("disclosedOnly", "1");
  if (s.visa) p.set("visa", "1");
  if (s.posted) p.set("posted", s.posted);
  if (s.source) p.set("source", s.source);
  if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
  return p;
}

export function JobsSearchView({ market, initial, initialState, taxonomies }: {
  market: Market;
  initial: SearchResult;
  initialState: SearchState;
  taxonomies: { specialisms: { slug: string; name: string }[] };
}) {
  const m = (p: string) => mhref(market, p);
  const { openAlertModal, openQuickCV } = useUser();
  const [state, setState] = useState<SearchState>(initialState);
  const [data, setData] = useState<SearchResult>(initial);
  const [jobs, setJobs] = useState<PublicJob[]>(initial.results);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nearest, setNearest] = useState<PublicJob[]>([]);
  const firstRender = useRef(true);
  const seq = useRef(0);

  const refresh = useCallback(async (s: SearchState) => {
    const my = ++seq.current;
    setLoading(true);
    setPage(1);
    // keep the URL shareable / back-safe
    const url = stateToParams(s, s.sort !== "recent" ? { sort: s.sort } : undefined);
    history.replaceState(null, "", (market === "US" ? "/us" : "") + "/jobs" + (url.toString() ? "?" + url : ""));
    try {
      const d = await api<SearchResult>("/jobs?" + stateToParams(s, { sort: s.sort, page: "1", country: market }));
      if (my !== seq.current) return;
      setData(d);
      setJobs(d.results);
      const lr = document.getElementById("live-region");
      if (lr) lr.textContent = `${d.total} jobs found`;
      if (!d.total) {
        const relax = new URLSearchParams();
        if (s.q) relax.set("q", s.q);
        relax.set("sort", "recent");
        relax.set("country", market);
        try {
          const r = await api<SearchResult>("/jobs?" + relax);
          if (my === seq.current) setNearest(r.results.slice(0, 3));
        } catch { setNearest([]); }
      }
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [market]);

  const update = useCallback((patch: Partial<SearchState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      refresh(next);
      return next;
    });
  }, [refresh]);

  useEffect(() => { firstRender.current = false; }, []);

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    const next = page + 1;
    try {
      const d = await api<SearchResult>("/jobs?" + stateToParams(state, { sort: state.sort, page: String(next), country: market }));
      setJobs((prev) => [...prev, ...d.results]);
      setPage(next);
    } finally { setLoading(false); }
  }

  const stateForAlert = () => ({ q: state.q, loc: state.loc, specialism: state.specialism.join(","), workModel: state.workModel.join(",") });
  const alertLabel = () =>
    [state.q, state.specialism.map((s) => SPEC_NAMES[s]).join("/"), state.loc].filter(Boolean).join(" · ") || `all new ${market} jobs`;

  /* ---- chips ---- */
  const chips: { label: string; undo: () => Partial<SearchState> }[] = [];
  if (state.q) chips.push({ label: `“${state.q}”`, undo: () => ({ q: "" }) });
  if (state.loc) chips.push({ label: state.loc, undo: () => ({ loc: "" }) });
  state.type.forEach((v) => chips.push({ label: TYPE_NAMES[v], undo: () => ({ type: state.type.filter((x) => x !== v) }) }));
  state.specialism.forEach((v) => chips.push({ label: SPEC_NAMES[v] || v, undo: () => ({ specialism: state.specialism.filter((x) => x !== v) }) }));
  state.workModel.forEach((v) => chips.push({ label: MODEL_NAMES[v], undo: () => ({ workModel: state.workModel.filter((x) => x !== v) }) }));
  state.seniority.forEach((v) => chips.push({ label: SEN_NAMES[v], undo: () => ({ seniority: state.seniority.filter((x) => x !== v) }) }));
  const sym = market === "US" ? "$" : "£";
  if (state.salaryMin || state.salaryMax) chips.push({ label: `${sym}${state.salaryMin || "0"}–${sym}${state.salaryMax || "∞"}`, undo: () => ({ salaryMin: "", salaryMax: "" }) });
  if (state.disclosedOnly) chips.push({ label: "Salary disclosed", undo: () => ({ disclosedOnly: false }) });
  if (state.visa) chips.push({ label: "Visa sponsorship", undo: () => ({ visa: false }) });
  if (state.posted) chips.push({ label: "Last " + state.posted + (state.posted === "1" ? " day" : " days"), undo: () => ({ posted: "" }) });
  if (state.source) chips.push({ label: state.source === "direct" ? "Orbit direct" : "Partner boards", undo: () => ({ source: "" }) });

  const shown = Math.min(page * PAGE_SIZE, data.total);

  const filterPanel = (
    <FilterPanel
      market={market}
      state={state}
      counts={data.counts}
      taxonomies={taxonomies}
      onChange={update}
      onClear={() => update(emptyState(state.sort))}
      onAlert={() => openAlertModal(stateForAlert(), alertLabel(), market)}
    />
  );

  return (
    <>
      <div className="hero"><div className="container split-2" style={{ paddingTop: 48, paddingBottom: 44 }}>
        <div>
          <span className="eyebrow">Job search</span>
          <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)", maxWidth: "18ch" }}>{market === "US" ? "Find your next role in the US" : "Find your next role"}</h1>
          <p className="hero-sub">Every {market} job in one honest search — filter by salary, work model, seniority and more.</p>
          <form className="search-bar" role="search" style={{ margin: "22px 0 0" }} onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            update({
              q: (f.elements.namedItem("q") as HTMLInputElement).value.trim(),
              loc: (f.elements.namedItem("loc") as HTMLInputElement).value.trim(),
            });
          }}>
            <input name="q" type="search" placeholder="Job title, skill or company" aria-label="Keywords" defaultValue={state.q} />
            <input name="loc" type="text" placeholder="City or region" aria-label="Location" defaultValue={state.loc} />
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
        </div>
        <img className="photo-panel m-hide" src="/media/img-search.webp" alt="A candidate browsing job categories and featured roles on a tablet" loading="lazy" />
      </div></div>

      <div className="container" style={{ marginTop: 28 }}>
        <button className="btn btn-ghost btn-sm filters-fab" onClick={() => setSheetOpen(true)}>Filters</button>
        <div className="search-layout">
          <aside className="filter-rail">
            <div className="filter-panel" aria-label="Filters">{filterPanel}</div>
          </aside>
          <div>
            <div className="chips-row">
              {chips.map((c, i) => (
                <span key={i} className="chip">{c.label} <button aria-label={`Remove filter ${c.label}`} onClick={() => update(c.undo())}>×</button></span>
              ))}
              {chips.length > 1 && <button className="btn btn-sm btn-ghost" style={{ height: 30 }} onClick={() => update(emptyState(state.sort))}>Clear all</button>}
            </div>
            <div className="results-head">
              <span className="small muted">
                {loading ? "Loading…" : <>Showing <strong>{shown}</strong> of <strong>{data.total}</strong> jobs</>}
              </span>
              <label className="small muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>Sort
                <select style={{ height: 42, width: 190 }} value={state.sort} onChange={(e) => update({ sort: e.target.value })}>
                  <option value="recent">Most recent</option>
                  <option value="relevance">Relevance</option>
                  <option value="salary-desc">Salary: high to low</option>
                  <option value="salary-asc">Salary: low to high</option>
                </select></label>
            </div>
            <div className="results-list">
              {loading && jobs.length === 0 ? <Skeletons n={5} /> : null}
              {!loading && data.total === 0 ? (
                <>
                  <div className="empty card">
                    <div className="ring-illo" aria-hidden="true" />
                    <h3>No exact matches — yet</h3>
                    <p className="muted" style={{ margin: "0 auto 18px", maxWidth: "44ch" }}>New roles land every day. Set an alert for this search and we&rsquo;ll email you the moment something fits, or drop us your CV.</p>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      <button className="btn btn-primary" onClick={() => openAlertModal(stateForAlert(), alertLabel(), market)}>Create this alert</button>
                      <button className="btn btn-ghost" onClick={openQuickCV}>Quick CV drop-off</button>
                    </div>
                  </div>
                  {nearest.length > 0 && <><h3 style={{ marginTop: 28 }}>Nearest matches</h3>{nearest.map((j) => <JobCard key={j.id} j={j} row />)}</>}
                </>
              ) : (
                jobs.map((j) => <JobCard key={j.id} j={j} row />)
              )}
            </div>
            <div style={{ textAlign: "center", marginTop: 22 }}>
              {shown < data.total && (
                <button className="btn btn-ghost" onClick={loadMore} disabled={loading}>{loading ? "Loading…" : "Load more jobs"}</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={"filter-sheet" + (sheetOpen ? " open" : "")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Filters</h3>
          <button className="icon-btn" aria-label="Close filters" onClick={() => setSheetOpen(false)}>✕</button></div>
        <div>{filterPanel}</div>
        <div className="sheet-actions"><button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setSheetOpen(false)}>Show results</button></div>
      </div>
    </>
  );
}

/* ---------------- filter panel ---------------- */
function FilterPanel({ market, state, counts, taxonomies, onChange, onClear, onAlert }: {
  market: Market;
  state: SearchState;
  counts: SearchResult["counts"];
  taxonomies: { specialisms: { slug: string; name: string }[] };
  onChange: (patch: Partial<SearchState>) => void;
  onClear: () => void;
  onAlert: () => void;
}) {
  const [salMin, setSalMin] = useState(state.salaryMin);
  const [salMax, setSalMax] = useState(state.salaryMax);
  const salTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { setSalMin(state.salaryMin); setSalMax(state.salaryMax); }, [state.salaryMin, state.salaryMax]);

  const group = (title: string, name: "type" | "specialism" | "workModel" | "seniority", options: [string, string][], cnt?: Record<string, number>) => (
    <details className="filter-group" open>
      <summary>{title} <IconChevD /></summary>
      <div className="opts">
        {options.map(([v, label]) => (
          <label key={v}>
            <input
              type="checkbox"
              checked={state[name].includes(v)}
              onChange={(e) => onChange({ [name]: e.target.checked ? [...state[name], v] : state[name].filter((x) => x !== v) } as Partial<SearchState>)}
            /> {label}
            {cnt?.[v] ? <span className="cnt">{cnt[v]}</span> : null}
          </label>
        ))}
      </div>
    </details>
  );

  const debounceSalary = (mn: string, mx: string) => {
    clearTimeout(salTimer.current);
    salTimer.current = setTimeout(() => onChange({ salaryMin: mn, salaryMax: mx }), 500);
  };

  return (
    <>
      {group("Job type", "type", Object.entries(TYPE_NAMES), counts.jobType)}
      {group("Specialism", "specialism", taxonomies.specialisms.map((s) => [s.slug, s.name] as [string, string]), counts.specialism)}
      {group("Work model", "workModel", Object.entries(MODEL_NAMES), counts.workModel)}
      {group("Seniority", "seniority", Object.entries(SEN_NAMES))}
      <details className="filter-group" open>
        <summary>Salary (annual) <IconChevD /></summary>
        <div className="opts">
          <div style={{ display: "flex", gap: 8 }}>
            <input type="number" placeholder={`Min ${market === "US" ? "$" : "£"}`} value={salMin} style={{ height: 42 }} aria-label="Minimum salary"
              onChange={(e) => { setSalMin(e.target.value); debounceSalary(e.target.value, salMax); }} />
            <input type="number" placeholder={`Max ${market === "US" ? "$" : "£"}`} value={salMax} style={{ height: 42 }} aria-label="Maximum salary"
              onChange={(e) => { setSalMax(e.target.value); debounceSalary(salMin, e.target.value); }} />
          </div>
          <label><input type="checkbox" checked={state.disclosedOnly} onChange={(e) => onChange({ disclosedOnly: e.target.checked })} /> Only show jobs with disclosed salary</label>
          {market === "US" && (
            <label><input type="checkbox" checked={state.visa} onChange={(e) => onChange({ visa: e.target.checked })} /> Visa sponsorship available</label>
          )}
        </div>
      </details>
      <details className="filter-group" open>
        <summary>Date posted <IconChevD /></summary>
        <div className="opts">
          {([["", "Any time"], ["1", "Last 24 hours"], ["3", "Last 3 days"], ["7", "Last week"], ["14", "Last 2 weeks"], ["30", "Last month"]] as [string, string][]).map(([v, l]) => (
            <label key={v}><input type="radio" name="posted" value={v} checked={state.posted === v} onChange={() => onChange({ posted: v })} /> {l}</label>
          ))}
        </div>
      </details>
      <details className="filter-group" open>
        <summary>Source <IconChevD /></summary>
        <div className="opts">
          <label><input type="radio" name="source" value="" checked={state.source === ""} onChange={() => onChange({ source: "" })} /> All listings</label>
          <label><input type="radio" name="source" value="direct" checked={state.source === "direct"} onChange={() => onChange({ source: "direct" })} /> Orbit direct {counts.class ? <span className="cnt">{counts.class.direct}</span> : null}</label>
          <label><input type="radio" name="source" value="partner" checked={state.source === "partner"} onChange={() => onChange({ source: "partner" })} /> Partner boards {counts.class ? <span className="cnt">{counts.class.aggregated}</span> : null}</label>
        </div>
      </details>
      <div style={{ paddingTop: 16, display: "grid", gap: 10 }}>
        <button className="btn btn-ghost btn-sm" onClick={onClear}>Clear all filters</button>
        <button className="btn btn-accent btn-sm" onClick={onAlert}>🔔 Alert me about jobs like this</button>
      </div>
    </>
  );
}
