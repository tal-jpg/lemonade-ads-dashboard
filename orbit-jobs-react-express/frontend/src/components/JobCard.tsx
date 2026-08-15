/**
 * Job card — presentational, no hooks, so it renders server-side on SSR pages
 * AND inside client components (load-more, account lists). Markup and classes
 * match the original OJ.jobCard exactly so orbit.css applies unchanged.
 */
import { salaryText, timeAgo } from "@/lib/format";
import { SPEC_NAMES } from "@/lib/taxonomy";
import type { PublicJob } from "@/lib/types";
import { IconChevR, IconClock, IconPin, IconWallet } from "@/lib/icons";
import { SaveButton } from "./SaveButton";

export function JobCard({ j, compact, row }: { j: PublicJob; compact?: boolean; row?: boolean }) {
  const sal = salaryText(j.salary);
  const color = j.class === "direct" ? "#10897C" : "#5E665F";
  const href = `${j.country === "US" ? "/us" : ""}/jobs/${j.slug}`;
  const srcChip = j.class === "direct"
    ? <span className="chip">Orbit direct</span>
    : <span className="chip neutral">via {j.source?.name}</span>;
  const also = j.source && j.source.alsoOn.length > 0
    ? <span className="caption">also on {j.source.alsoOn.join(", ")}</span> : null;

  if (row) {
    return (
      <article className="card job-row" data-id={j.id}>
        <div className="jr-main">
          {j.specialism && <span className="jr-sector">{SPEC_NAMES[j.specialism] || j.specialism.replace(/-/g, " ")}</span>}
          <h3 className="jr-title"><a href={href}>{j.title}</a></h3>
          <div className="jc-meta">
            <span className="m"><strong style={{ color: "var(--text-strong)" }}>{j.companyName}</strong></span>
            <span className="m"><IconPin />{j.location.city}{j.workModel !== "on-site" ? " · " + j.workModel : ""}</span>
            <span className={"m jc-salary" + (sal ? "" : " undisclosed")}><IconWallet />{sal || "Salary not disclosed"}</span>
            <span className="m" style={{ textTransform: "capitalize" }}><IconClock />{j.jobType}</span>
          </div>
          <p className="jr-summary">{j.summary || ""}</p>
          <div className="jr-foot">
            {srcChip}
            {j.visaSponsorship && <span className="chip success">Visa sponsorship</span>}
            {also}
            <span className="caption" style={{ marginLeft: "auto" }}>{timeAgo(j.postedAt)}</span>
          </div>
        </div>
        <div className="jr-side">
          <SaveButton jobId={j.id} />
          <span className="jr-arrow" aria-hidden="true"><IconChevR /></span>
        </div>
      </article>
    );
  }

  return (
    <article className="card job-card" data-id={j.id}>
      <div className="jc-top">
        <span className="jc-logo" style={{ background: color }} aria-hidden="true">{(j.companyName || "?")[0]}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="jc-title"><a href={href}>{j.title}</a></div>
          <div className="jc-company">{j.companyName}</div>
        </div>
        <SaveButton jobId={j.id} />
      </div>
      <div className="jc-meta">
        <span className="m"><IconPin />{j.location.city}{j.workModel !== "on-site" ? " · " + j.workModel : ""}</span>
        <span className="m"><IconClock />{j.jobType}</span>
        <span className={"m jc-salary" + (sal ? "" : " undisclosed")}><IconWallet />{sal || "Salary not disclosed"}</span>
      </div>
      {!compact && <p className="jc-summary">{j.summary || ""}</p>}
      <div className="jc-foot">
        <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {srcChip}
          {j.visaSponsorship && <span className="chip success">Visa sponsorship</span>}
          {also}
        </span>
        <span className="caption">{timeAgo(j.postedAt)}</span>
      </div>
    </article>
  );
}

export function Skeletons({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="card skel-card" aria-hidden="true">
          <div className="skel l1" /><div className="skel l2" /><div className="skel l3" />
        </div>
      ))}
    </>
  );
}
