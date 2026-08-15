/** 3-step posting wizard: basics → details & salary → review & publish.
    Autosaving drafts, US pay-transparency validation, live preview. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "@/lib/client";
import { PAY_TRANSPARENCY_STATES } from "@/lib/taxonomy";
import type { Market, Salary } from "@/lib/types";
import { IconChevR, IconClock, IconPin, IconWallet } from "@/lib/icons";
import { Skeletons } from "@/components/JobCard";
import { useToast, useUser } from "@/components/providers";

interface WizardJob {
  id: string | null;
  title: string; specialism: string; industry: string; city: string;
  workModel: string; jobType: string; seniority: string; country: Market;
  descriptionIntro: string; responsibilities: string[]; requirements: string[]; benefits: string[];
  salaryDisclosed: boolean; salaryMin: string; salaryMax: string; salaryPeriod: string;
  applyMethod: string; externalApplyUrl: string;
  screeningQuestions: { q: string; kind: string }[];
  visaSponsorship: boolean;
}

interface Taxo {
  specialisms: { slug: string; name: string }[];
  industries: { slug: string; name: string }[];
  locations: { city: string; region: string }[];
}

export function WizardView() {
  const { user, ready, signInGate } = useUser();
  const [params] = useSearchParams();
  const toast = useToast();
  const editId = params.get("id");

  const [step, setStep] = useState(1);
  const [J, setJ] = useState<WizardJob>({
    id: editId || null, title: "", specialism: "", industry: "", city: "", workModel: "hybrid",
    jobType: "permanent", seniority: "mid", country: "UK",
    descriptionIntro: "", responsibilities: [], requirements: [], benefits: [],
    salaryDisclosed: true, salaryMin: "", salaryMax: "", salaryPeriod: "year",
    applyMethod: "native", externalApplyUrl: "", screeningQuestions: [], visaSponsorship: false,
  });
  const [taxoUK, setTaxoUK] = useState<Taxo | null>(null);
  const [taxoUS, setTaxoUS] = useState<Taxo | null>(null);
  const [companyName, setCompanyName] = useState("Your company");
  const [err, setErr] = useState("");
  const [autosaved, setAutosaved] = useState("");
  const [published, setPublished] = useState<{ status: string; slug?: string; message: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const jRef = useRef(J);
  jRef.current = J;

  useEffect(() => {
    if (!(ready && user?.role === "employer")) return;
    Promise.all([
      api<Taxo>("/meta/taxonomies?country=UK"),
      api<Taxo>("/meta/taxonomies?country=US"),
    ]).then(([uk, us]) => { setTaxoUK(uk); setTaxoUS(us); });
    api<{ company: { name: string; country?: Market } }>("/employer/company").then(({ company }) => {
      setCompanyName(company.name);
      if (!editId && company.country) setJ((prev) => ({ ...prev, country: company.country as Market }));
    }).catch(() => {});
    if (editId) {
      api<{ job: {
        id: string; title: string; specialism: string | null; industry: string | null;
        location: { city: string; country: Market }; workModel: string; jobType: string; seniority: string;
        description: { intro: string; responsibilities: string[]; requirements: string[]; benefits: string[] };
        salary: Salary; applyMethod: string; externalApplyUrl: string | null;
        screeningQuestions: { q: string; kind: string }[]; visaSponsorship?: boolean;
      } }>("/employer/jobs/" + editId).then(({ job }) => {
        setJ({
          id: job.id, title: job.title, specialism: job.specialism || "", industry: job.industry || "",
          city: job.location.city, workModel: job.workModel, jobType: job.jobType, seniority: job.seniority,
          country: job.location.country || "UK",
          descriptionIntro: job.description.intro, responsibilities: job.description.responsibilities,
          requirements: job.description.requirements, benefits: job.description.benefits,
          salaryDisclosed: job.salary.disclosed, salaryMin: String(job.salary.min || ""), salaryMax: String(job.salary.max || ""),
          salaryPeriod: job.salary.period, applyMethod: job.applyMethod, externalApplyUrl: job.externalApplyUrl || "",
          screeningQuestions: job.screeningQuestions || [], visaSponsorship: !!job.visaSponsorship,
        });
      }).catch(() => {});
    }
  }, [ready, user, editId]);

  const autosave = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await api<{ id: string }>("/employer/jobs/draft", { method: "POST", body: jRef.current });
        setJ((prev) => (prev.id === r.id ? prev : { ...prev, id: r.id }));
        setAutosaved("Draft saved " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      } catch { /* quiet */ }
    }, 900);
  }, []);

  const upd = useCallback((patch: Partial<WizardJob>) => {
    setJ((prev) => ({ ...prev, ...patch }));
    autosave();
  }, [autosave]);

  if (!ready) return <div className="container" style={{ paddingTop: 64 }}><Skeletons n={2} /></div>;

  if (!user || user.role !== "employer") {
    return (
      <div className="container" style={{ maxWidth: 720, paddingTop: 48 }}>
        <div className="card" style={{ padding: 40, textAlign: "center" }}>
          <div className="ring-illo" style={{ margin: "0 auto 18px" }} />
          <span className="eyebrow">For employers</span>
          <h1 style={{ fontSize: 32 }}>Post a job on Orbit Jobs</h1>
          <p className="muted" style={{ margin: "0 auto 20px", maxWidth: "46ch" }}>Free while we launch. Three steps, under five minutes, applicants in one dashboard. Sign in or create an employer account to start.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <a className="btn btn-primary" href="/account/register?as=employer">Create employer account</a>
            <button className="btn btn-ghost" onClick={async () => { if (await signInGate("Sign in with your employer account to post a job.")) window.location.reload(); }}>Sign in</button>
          </div>
          <p className="caption" style={{ marginTop: 16 }}>Demo employer: priya@thameslogistics.example / demo1234</p>
        </div>
      </div>
    );
  }

  if (published) {
    return (
      <div className="container" style={{ maxWidth: 640, paddingTop: 64 }}>
        <div className="success-panel" style={{ textAlign: "center", padding: 48 }}>
          <h2>{published.status === "live" ? "🎉 Your job is live" : "✅ Submitted for review"}</h2>
          <p>{published.message}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
            {published.status === "live" && published.slug && <a className="btn btn-primary" href={`/jobs/${published.slug}`}>View your listing</a>}
            <a className="btn btn-ghost" href="/employers/dashboard">Go to dashboard</a>
          </div>
        </div>
      </div>
    );
  }

  const taxo = taxoUK;
  const cities = (J.country === "US" ? taxoUS : taxoUK)?.locations.map((l) => l.city) || [];
  const sym = J.country === "US" ? "$" : "£";

  function nextStep() {
    setErr("");
    if (step === 1) {
      const missing: string[] = [];
      if (!J.title || J.title.length < 3) missing.push("job title");
      if (!J.specialism) missing.push("specialism");
      if (!J.city) missing.push("location");
      if (missing.length) { setErr("Please add: " + missing.join(", ") + "."); return; }
    }
    if (step === 2) {
      if (!J.descriptionIntro || J.descriptionIntro.trim().length < 40) { setErr("Describe the role — at least a short paragraph (40+ characters)."); return; }
      if (J.salaryDisclosed && (!Number(J.salaryMin) || !Number(J.salaryMax) || Number(J.salaryMax) < Number(J.salaryMin))) { setErr("Enter a valid salary range, or untick the salary box."); return; }
      if (J.country === "US" && !J.salaryDisclosed) {
        const region = taxoUS?.locations.find((l) => l.city === J.city)?.region;
        if (region && PAY_TRANSPARENCY_STATES.includes(region)) { setErr(`${region} law requires a published pay range on job postings — add the range to continue.`); return; }
      }
      if (J.applyMethod === "external" && !/^https?:\/\/.+/.test(J.externalApplyUrl)) { setErr("External applications need a full URL (https://…)."); return; }
    }
    setStep(step + 1);
    window.scrollTo(0, 0);
  }

  const stepper = (
    <>
      <div className="wizard-steps">
        {["Basics", "Details & salary", "Review & publish"].map((t, i) => (
          <div key={t} className={"wstep " + (step === i + 1 ? "active" : step > i + 1 ? "done" : "")}>
            <span className="ws-n">{step > i + 1 ? "✓" : i + 1}</span><span className="ws-t">{t}</span>
          </div>
        ))}
      </div>
      <p className="caption" style={{ textAlign: "right", minHeight: 18 }}>{autosaved}</p>
    </>
  );

  const head = (
    <>
      <span className="eyebrow">Post a job · free at launch</span>
      <h1 style={{ fontSize: "clamp(30px,3.6vw,42px)" }}>Post a job</h1>
      {stepper}
    </>
  );

  const sal = J.salaryDisclosed && J.salaryMax
    ? `${sym}${Number(J.salaryMin || J.salaryMax).toLocaleString()}–${sym}${Number(J.salaryMax).toLocaleString()} a ${J.salaryPeriod}`
    : "Salary not disclosed";

  return (
    <div className="container" style={{ maxWidth: 760, paddingTop: 36 }}>
      {head}
      {step === 1 && (
        <div className="card" style={{ padding: 32 }}>
          <div className="field"><label className="f-label" htmlFor="w-title">Job title</label>
            <input id="w-title" value={J.title} placeholder="e.g. Management Accountant" list="title-suggest" onChange={(e) => upd({ title: e.target.value })} />
            <datalist id="title-suggest">
              {["Software Engineer", "Management Accountant", "Marketing Executive", "Warehouse Operative", "Registered Nurse", "Site Manager", "Customer Service Advisor", "HR Advisor"].map((t) => <option key={t} value={t} />)}
            </datalist></div>
          <div className="field"><label className="f-label" htmlFor="w-country">Market</label>
            <select id="w-country" value={J.country} onChange={(e) => upd({ country: e.target.value as Market, city: "" })}>
              <option value="UK">UK Jobs (£)</option>
              <option value="US">US Jobs ($)</option>
            </select>
            <p className="f-hint">Your role appears only in the selected market&rsquo;s search.</p></div>
          <div className="form-grid">
            <div className="field"><label className="f-label" htmlFor="w-specialism">Specialism</label>
              <select id="w-specialism" value={J.specialism} onChange={(e) => upd({ specialism: e.target.value })}>
                <option value="">Choose…</option>
                {taxo?.specialisms.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select></div>
            <div className="field"><label className="f-label" htmlFor="w-industry">Industry (optional)</label>
              <select id="w-industry" value={J.industry} onChange={(e) => upd({ industry: e.target.value })}>
                <option value="">Choose…</option>
                {taxo?.industries.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select></div>
            <div className="field"><label className="f-label" htmlFor="w-city">Location</label>
              <select id="w-city" value={J.city} onChange={(e) => upd({ city: e.target.value })}>
                <option value="">Choose…</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="field"><label className="f-label" htmlFor="w-workModel">Work model</label>
              <select id="w-workModel" value={J.workModel} onChange={(e) => upd({ workModel: e.target.value })}>
                {[["on-site", "On-site"], ["hybrid", "Hybrid"], ["remote", `Remote (${J.country})`]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="field"><label className="f-label" htmlFor="w-jobType">Job type</label>
              <select id="w-jobType" value={J.jobType} onChange={(e) => upd({ jobType: e.target.value })}>
                {[["permanent", "Permanent"], ["contract", "Contract"], ["temporary", "Temporary"], ["part-time", "Part-time"], ["apprenticeship", "Apprenticeship"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div className="field"><label className="f-label" htmlFor="w-seniority">Seniority</label>
              <select id="w-seniority" value={J.seniority} onChange={(e) => upd({ seniority: e.target.value })}>
                {[["junior", "Junior / entry"], ["mid", "Mid-level"], ["senior", "Senior"], ["lead", "Lead / head of"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
          </div>
          {err && <div className="f-error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={nextStep}>Continue <IconChevR /></button></div>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ padding: 32 }}>
          <div className="field"><label className="f-label" htmlFor="w-intro">About the role</label>
            <textarea id="w-intro" rows={4} placeholder="Two or three sentences on the role, the team and why it matters." value={J.descriptionIntro} onChange={(e) => upd({ descriptionIntro: e.target.value })} /></div>
          <div className="field"><label className="f-label" htmlFor="w-resp">What they&rsquo;ll do <span className="muted">(one per line)</span></label>
            <textarea id="w-resp" rows={4} defaultValue={J.responsibilities.join("\n")} onChange={(e) => upd({ responsibilities: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} /></div>
          <div className="field"><label className="f-label" htmlFor="w-req">What they&rsquo;ll need <span className="muted">(one per line — keep the must-haves under six)</span></label>
            <textarea id="w-req" rows={4} defaultValue={J.requirements.join("\n")} onChange={(e) => upd({ requirements: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} /></div>
          <div className="field"><label className="f-label" htmlFor="w-ben">What they&rsquo;ll get <span className="muted">(one per line)</span></label>
            <textarea id="w-ben" rows={3} defaultValue={J.benefits.join("\n")} onChange={(e) => upd({ benefits: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} /></div>

          <div className="nudge" style={{ margin: "8px 0 20px" }}>
            <strong>Show the salary.</strong> Listings with a published range get significantly more applications on Orbit Jobs — and &ldquo;competitive&rdquo; reads as &ldquo;below what you&rsquo;re imagining&rdquo;.
            {J.country === "US" && <> <strong>Note:</strong> postings in New York, California, Colorado and Washington legally require a pay range.</>}
          </div>
          <div className="field checkbox"><input type="checkbox" id="w-disclosed" checked={J.salaryDisclosed} onChange={(e) => upd({ salaryDisclosed: e.target.checked })} /><label htmlFor="w-disclosed">Publish the salary range (recommended)</label></div>
          {J.salaryDisclosed && (
            <div className="form-grid grid-3">
              <div className="field"><label className="f-label" htmlFor="w-smin">From ({sym})</label><input id="w-smin" type="number" value={J.salaryMin} onChange={(e) => upd({ salaryMin: e.target.value })} /></div>
              <div className="field"><label className="f-label" htmlFor="w-smax">To ({sym})</label><input id="w-smax" type="number" value={J.salaryMax} onChange={(e) => upd({ salaryMax: e.target.value })} /></div>
              <div className="field"><label className="f-label" htmlFor="w-speriod">Per</label>
                <select id="w-speriod" value={J.salaryPeriod} onChange={(e) => upd({ salaryPeriod: e.target.value })}>
                  {[["year", "Year"], ["day", "Day"], ["hour", "Hour"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></div>
            </div>
          )}

          {J.country === "US" && (
            <div className="field checkbox"><input type="checkbox" id="w-visa" checked={J.visaSponsorship} onChange={(e) => upd({ visaSponsorship: e.target.checked })} /><label htmlFor="w-visa">Visa sponsorship available (H-1B or similar) — adds a searchable badge</label></div>
          )}

          <div className="field"><label className="f-label">How should candidates apply?</label>
            <div style={{ display: "grid", gap: 8 }}>
              <label className="checkbox"><input type="radio" name="w-apply" value="native" checked={J.applyMethod === "native"} onChange={() => upd({ applyMethod: "native" })} /> Collect applications on Orbit Jobs (recommended — one dashboard, CVs included)</label>
              <label className="checkbox"><input type="radio" name="w-apply" value="external" checked={J.applyMethod === "external"} onChange={() => upd({ applyMethod: "external" })} /> Send applicants to our own site</label>
            </div>
            {J.applyMethod === "external" && (
              <input type="url" placeholder="https://yourcompany.com/careers/role" value={J.externalApplyUrl} style={{ marginTop: 10 }} onChange={(e) => upd({ externalApplyUrl: e.target.value })} />
            )}
          </div>

          <div className="field"><label className="f-label">Screening questions <span className="muted">(up to 3 — three good questions beat fifty CV filters)</span></label>
            <div>
              {J.screeningQuestions.map((q, i) => (
                <div key={i} className="sq-row" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input placeholder="e.g. Describe a month-end you ran solo — what broke?" value={q.q} style={{ flex: 1 }}
                    onChange={(e) => upd({ screeningQuestions: J.screeningQuestions.map((x, xi) => xi === i ? { ...x, q: e.target.value } : x) })} />
                  <select style={{ width: 140 }} value={q.kind}
                    onChange={(e) => upd({ screeningQuestions: J.screeningQuestions.map((x, xi) => xi === i ? { ...x, kind: e.target.value } : x) })}>
                    <option value="text">Short answer</option><option value="yesno">Yes / No</option>
                  </select>
                  <button className="btn btn-sm btn-danger" type="button" aria-label="Remove question"
                    onClick={() => upd({ screeningQuestions: J.screeningQuestions.filter((_, xi) => xi !== i) })}>×</button>
                </div>
              ))}
            </div>
            <button className="btn btn-sm btn-ghost" type="button" onClick={() => {
              if (J.screeningQuestions.length >= 3) return toast("Three questions is the maximum — more cuts completion.", "err");
              upd({ screeningQuestions: [...J.screeningQuestions, { q: "", kind: "text" }] });
            }}>+ Add question</button></div>

          {err && <div className="f-error">{err}</div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={() => { setStep(1); window.scrollTo(0, 0); }}>‹ Back</button>
            <button className="btn btn-primary" onClick={nextStep}>Preview <IconChevR /></button></div>
        </div>
      )}

      {step === 3 && (
        <div className="card" style={{ padding: 32 }}>
          <h3 style={{ marginBottom: 4 }}>Preview — exactly as candidates will see it</h3>
          <p className="caption" style={{ marginBottom: 16 }}>Listing runs 30 days with reminders before expiry. Edit any time.</p>
          <div className="card job-card" style={{ background: "var(--surface-subtle)" }}>
            <div className="jc-top"><span className="jc-logo" style={{ background: "#10897C" }}>{(user.name || "?")[0]}</span>
              <div style={{ flex: 1 }}><div className="jc-title">{J.title || "(untitled role)"}</div><div className="jc-company">{companyName}</div></div></div>
            <div className="jc-meta">
              <span className="m"><IconPin />{J.city}{J.workModel !== "on-site" ? " · " + J.workModel : ""}</span>
              <span className="m"><IconClock />{J.jobType}</span>
              <span className={"m jc-salary" + (J.salaryDisclosed ? "" : " undisclosed")}><IconWallet />{sal}</span></div>
            <p className="jc-summary">{J.descriptionIntro.slice(0, 160)}…</p>
            <div className="jc-foot"><span style={{ display: "flex", gap: 8 }}><span className="chip">Orbit direct</span><span className="chip neutral">{J.country} market</span>{J.visaSponsorship && J.country === "US" && <span className="chip success">Visa sponsorship</span>}</span><span className="caption">Today</span></div>
          </div>
          {!J.salaryDisclosed && (
            <div className="nudge" style={{ marginTop: 16 }}>Still hiding the salary — you can publish anyway, but expect fewer applications. <button className="btn btn-sm btn-ghost" onClick={() => setStep(2)}>Add a range</button></div>
          )}
          <h4 style={{ marginTop: 24 }}>Full description</h4>
          <div className="desc small">
            <p>{J.descriptionIntro}</p>
            {J.responsibilities.length > 0 && <><h3 style={{ fontSize: 16 }}>What you&rsquo;ll do</h3><ul>{J.responsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
            {J.requirements.length > 0 && <><h3 style={{ fontSize: 16 }}>What you&rsquo;ll need</h3><ul>{J.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
            {J.benefits.length > 0 && <><h3 style={{ fontSize: 16 }}>What you&rsquo;ll get</h3><ul>{J.benefits.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
            {J.screeningQuestions.length > 0 && <><h3 style={{ fontSize: 16 }}>Screening questions</h3><ul>{J.screeningQuestions.map((q, i) => <li key={i}>{q.q} <span className="caption">({q.kind === "yesno" ? "yes/no" : "short answer"})</span></li>)}</ul></>}
          </div>
          {err && <div className="f-error" dangerouslySetInnerHTML={{ __html: err }} />}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button className="btn btn-ghost" onClick={() => { setStep(2); window.scrollTo(0, 0); }}>‹ Edit details</button>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" onClick={async () => {
                const r = await api<{ id: string }>("/employer/jobs/draft", { method: "POST", body: J });
                setJ((prev) => ({ ...prev, id: r.id }));
                toast("Draft saved — find it in your dashboard.");
              }}>Save as draft</button>
              <button className="btn btn-primary btn-lg" onClick={async () => {
                setErr("");
                try {
                  const r = await api<{ status: string; slug?: string; message: string }>("/employer/jobs/publish", { method: "POST", body: J });
                  setPublished(r);
                  window.scrollTo(0, 0);
                } catch (ex) {
                  if (ex instanceof ApiError && (ex.data as { errors?: string[] })?.errors) {
                    setErr((ex.data as { errors: string[] }).errors.map((s) => s.replace(/</g, "&lt;")).join("<br>"));
                  } else setErr(ex instanceof Error ? ex.message : "Publish failed");
                }
              }}>Publish job</button></div></div>
        </div>
      )}
    </div>
  );
}
