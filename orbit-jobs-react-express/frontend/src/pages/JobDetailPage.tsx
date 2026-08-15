/** Job detail — full content + JSON-LD, with apply/share islands. 410 → closed-role page. */
import { useParams } from "react-router-dom";
import { api, ApiError } from "@/lib/client";
import { JsonLd, useData, usePageMeta } from "@/lib/hooks";
import { jobPostingLD } from "@/lib/seo";
import { salaryText, timeAgo } from "@/lib/format";
import { MODEL_NAMES, SPEC_NAMES, TYPE_NAMES, mhref } from "@/lib/taxonomy";
import type { GonePayload, Market, PublicJob, PublicJobFull } from "@/lib/types";
import { JobCard, Skeletons } from "@/components/JobCard";
import { SaveButton } from "@/components/SaveButton";
import { ApplyZone, ExpiredAlertButton, ShareRow, StickyApply } from "@/components/views/JobDetailClient";
import { IconChevR } from "@/lib/icons";
import { NotFoundPage } from "./NotFoundPage";

type Loaded =
  | { kind: "live"; job: PublicJobFull; similar: PublicJob[] }
  | { kind: "gone"; payload: GonePayload };

export function JobDetailPage({ market }: { market: Market }) {
  const { slug = "" } = useParams();
  const m = (p: string) => mhref(market, p);

  const { data, loading, notFound } = useData<Loaded>(async () => {
    try {
      const { job } = await api<{ job: PublicJobFull }>(`/jobs/${encodeURIComponent(slug)}`);
      const { results } = await api<{ results: PublicJob[] }>(`/jobs/${job.id}/similar`).catch(() => ({ results: [] as PublicJob[] }));
      return { kind: "live", job, similar: results };
    } catch (ex) {
      if (ex instanceof ApiError && ex.status === 410) return { kind: "gone", payload: ex.data as GonePayload };
      throw ex;
    }
  }, [slug]);

  const live = data?.kind === "live" ? data.job : null;
  const sal = live ? salaryText(live.salary) : null;
  usePageMeta(
    live
      ? `${live.title} at ${live.companyName} — ${live.location.city} | Orbit Jobs`
      : data?.kind === "gone"
        ? `${data.payload.job.title} (role closed) | Orbit Jobs`
        : undefined,
    live ? `${live.title} in ${live.location.city}. ${live.description.intro.slice(0, 120)}` : undefined,
  );

  if (loading) return <div className="container" style={{ paddingTop: 48 }}><Skeletons n={4} /></div>;
  if (notFound || !data) return <NotFoundPage />;

  /* Expired / closed role: alternatives page. */
  if (data.kind === "gone") {
    const g = data.payload;
    const specName = SPEC_NAMES[g.job.specialism] || "similar";
    return (
      <div className="container" style={{ paddingTop: 48, maxWidth: 860 }}>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div className="ring-illo" style={{ margin: "0 auto 18px" }} />
          <h1 style={{ fontSize: 32 }}>This role has closed</h1>
          <p className="muted" style={{ margin: "0 auto 8px", maxWidth: "46ch" }}>
            <strong>{g.job.title}</strong> at {g.job.companyName} is no longer taking applications — but similar roles are live right now.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
            <a className="btn btn-primary" href={`${g.job.country === "US" ? "/us" : ""}/jobs?specialism=${g.job.specialism}`}>See {specName} jobs</a>
            <ExpiredAlertButton specialism={g.job.specialism} label={specName + " roles"} market={g.job.country} />
          </div>
        </div>
        {g.similar.length > 0 && (
          <>
            <h2 style={{ marginTop: 40, fontSize: 26 }}>Similar live roles</h2>
            <div className="results-list">{g.similar.map((x) => <JobCard key={x.id} j={x} />)}</div>
          </>
        )}
      </div>
    );
  }

  const j = data.job;
  const similar = data.similar;
  const ld = jobPostingLD(j);

  const sideCard = j.company ? (
    <div className="card side-card">
      <div className="jc-top" style={{ marginBottom: 10 }}>
        <span className="jc-logo" style={{ background: j.company.color || "#10897C" }}>{j.company.mark || j.companyName[0]}</span>
        <div>
          <div className="jc-title">{j.company.name}</div>
          <div className="jc-company">{(j.company.industry || "").replace(/-/g, " ")}</div>
        </div>
      </div>
      <p className="small">{(j.company.about || "").slice(0, 180)}{(j.company.about || "").length > 180 ? "…" : ""}</p>
      <p className="small muted">{j.company.liveRoles} live role{j.company.liveRoles === 1 ? "" : "s"} on Orbit Jobs</p>
      <a className="arrow-link small" href={m(`/companies/${j.company.slug}`)}>View company profile <IconChevR /></a>
    </div>
  ) : (
    <div className="card side-card">
      <h4>About this listing</h4>
      <p className="small">This role is listed via our partner <strong>{j.source?.name}</strong>{j.source && j.source.alsoOn.length > 0 ? ` (also on ${j.source.alsoOn.join(", ")})` : ""}. You&rsquo;ll complete your application on their site — Orbit Jobs always shows you where a job comes from.</p>
      <div className="source-note small">Partner listings are refreshed at least daily and removed when they close at the source.</div>
    </div>
  );

  return (
    <>
      <JsonLd data={ld} />
      <div className="hero job-hero">
        <div className="container">
          <a className="small" href={m("/jobs")}>‹ Back to results</a>
          <div><a className="job-sector" href={m(`/specialisms/${j.specialism}`)}>{SPEC_NAMES[j.specialism] || j.specialism}</a></div>
          <h1 className="job-title">{j.title}</h1>
          <div className="job-meta-grid">
            <div><span className="jm-label">Location</span><span className="jm-value">{j.location.city}{j.location.region && j.location.region !== j.location.city ? ", " + j.location.region : ""}</span></div>
            <div><span className="jm-label">Salary</span><span className={"jm-value" + (sal ? " jm-salary" : "")}>{sal || "Not disclosed"}</span></div>
            <div><span className="jm-label">Job type</span><span className="jm-value">{TYPE_NAMES[j.jobType] || j.jobType} · {MODEL_NAMES[j.workModel] || j.workModel}</span></div>
            <div><span className="jm-label">Posted</span><span className="jm-value">{timeAgo(j.postedAt)}</span></div>
            <div><span className="jm-label">Company</span><span className="jm-value">{j.companyName}</span></div>
          </div>
          <div className="job-cta-row">
            <a className="btn btn-primary btn-lg" href="#apply" id="apply-top">Apply now</a>
            <SaveButton jobId={j.id} className="save-btn card" style={{ width: 52, height: 52, padding: 0, borderRadius: 999 }} />
            {j.class === "direct"
              ? <span className="chip">Orbit direct — apply in 60 seconds</span>
              : <span className="chip neutral">via {j.source?.name}</span>}
            {j.visaSponsorship && <span className="chip success">Visa sponsorship</span>}
            <span className="caption">Ref {j.reference}</span>
          </div>
        </div>
      </div>
      <div className="container">
        <div className="job-detail-layout" style={{ marginTop: 40 }}>
          <div>
            <div className="desc">
              <p style={{ fontSize: 18 }}>{j.description.intro}</p>
              {j.description.responsibilities?.length > 0 && <><h3>What you&rsquo;ll do</h3><ul>{j.description.responsibilities.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
              {j.description.requirements?.length > 0 && <><h3>What you&rsquo;ll need</h3><ul>{j.description.requirements.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
              {j.description.benefits?.length > 0 && <><h3>What you&rsquo;ll get</h3><ul>{j.description.benefits.map((r, i) => <li key={i}>{r}</li>)}</ul></>}
            </div>
            <ShareRow j={j} />
            <ApplyZone j={j} />
          </div>
          <aside>
            <img className="photo-panel" src="/media/img-handshake.webp" alt="A recruiter and candidate shaking hands across an interview table" loading="lazy" style={{ borderRadius: 20, marginBottom: 18, boxShadow: "var(--shadow-card)" }} />
            {sideCard}
          </aside>
        </div>

        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 26 }}>Similar jobs</h2>
          <div className="rail">
            {similar.length > 0
              ? similar.map((x) => <JobCard key={x.id} j={x} compact />)
              : <p className="muted">Nothing close enough yet — try the full search.</p>}
          </div>
        </section>
      </div>
      <StickyApply title={j.title} salaryLabel={sal || "Salary on application"} />
    </>
  );
}
