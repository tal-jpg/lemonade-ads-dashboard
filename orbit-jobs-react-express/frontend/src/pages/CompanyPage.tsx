/** Company profile — hero, live roles, about card. */
import { useParams } from "react-router-dom";
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import type { CompanyProfileData, Market } from "@/lib/types";
import { JobCard, Skeletons } from "@/components/JobCard";
import { AlertButton } from "@/components/views/JobDetailClient";
import { IconPin } from "@/lib/icons";
import { NotFoundPage } from "./NotFoundPage";

export function CompanyPage({ market }: { market: Market }) {
  const { slug = "" } = useParams();
  const { data, loading, notFound } = useData(
    () => api<CompanyProfileData>(`/meta/companies/${encodeURIComponent(slug)}`),
    [slug],
  );
  usePageMeta(
    data ? `${data.company.name} — Jobs & Company Profile | Orbit Jobs` : undefined,
    data ? (data.company.about || "").slice(0, 155) : undefined,
  );

  if (loading) return <div className="container" style={{ paddingTop: 48 }}><Skeletons n={4} /></div>;
  if (notFound || !data) return <NotFoundPage />;

  const c = data.company;

  return (
    <>
      <div className="hero"><div className="container" style={{ paddingTop: 56, paddingBottom: 40 }}>
        <div className="jc-top">
          <span className="jc-logo" style={{ background: c.color, width: 64, height: 64, fontSize: 26, borderRadius: 20 }}>{c.mark}</span>
          <div>
            <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>{c.name}</h1>
            <div className="jc-meta">
              <span className="m">{(c.industry || "").replace(/-/g, " ")}</span>
              {c.city && <span className="m"><IconPin />{c.city}</span>}
              {c.size && <span className="m">{c.size} people</span>}
            </div>
          </div>
        </div>
      </div></div>
      <div className="container cp-grid" style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 320px", gap: 40 }}>
        <div>
          <h2 style={{ fontSize: 26 }}>Live roles ({data.jobs.length})</h2>
          <div className="results-list" style={{ marginTop: 16 }}>
            {data.jobs.length > 0
              ? data.jobs.map((j) => <JobCard key={j.id} j={j} />)
              : <p className="muted">No live roles right now — follow the company to hear first.</p>}
          </div>
        </div>
        <aside>
          <div className="card">
            <h4>About</h4>
            <p className="small">{c.about || "No description yet."}</p>
            {c.website && <p className="small"><a href={c.website} rel="noopener">Website ↗</a></p>}
            <AlertButton filters={{ q: c.name }} label={`new roles at ${c.name}`} market={market} className="btn btn-primary">
              Follow — alert me to new roles
            </AlertButton>
          </div>
        </aside>
      </div>
      {/* stack the sidebar under the roles on smaller screens */}
      <style>{`@media (max-width: 1024px) { .cp-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
