/** Candidate/employer paired call-to-action band, shared by many pages. */
import { mhref } from "@/lib/taxonomy";
import type { Market } from "@/lib/types";

export function PairedCTA({ market }: { market: Market }) {
  const m = (p: string) => mhref(market, p);
  return (
    <section className="band tight"><div className="container">
      <div className="paired">
        <div className="card reveal" style={{ background: "var(--surface-brand-tint)", border: "none" }}>
          <h3>Looking for your next role?</h3>
          <p className="small" style={{ marginBottom: 18 }}>Search every source in one place — or drop your CV and let roles find you.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn btn-primary" href={m("/jobs")}>Search jobs</a><a className="btn btn-ghost" href="/candidates/upload-cv">Upload CV</a></div>
        </div>
        <div className="card reveal" style={{ background: "var(--surface-accent-tint)", border: "none" }}>
          <h3>Hiring for your team?</h3>
          <p className="small" style={{ marginBottom: 18 }}>Post in under five minutes, free while we launch. Applicants land in one clean dashboard.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn btn-accent" href="/employers/post-a-job">Post a job</a><a className="btn btn-ghost" href="/employers">How it works</a></div>
        </div>
      </div>
    </div></section>
  );
}
