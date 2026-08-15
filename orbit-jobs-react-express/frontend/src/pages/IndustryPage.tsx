/** Industry landing page — live feed + roles + other industries. */
import { useParams } from "react-router-dom";
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import { mhref } from "@/lib/taxonomy";
import type { IndustryPageData, Market } from "@/lib/types";
import { JobCard, Skeletons } from "@/components/JobCard";
import { PairedCTA } from "@/components/PairedCTA";
import { NotFoundPage } from "./NotFoundPage";

export function IndustryPage({ market }: { market: Market }) {
  const { slug = "" } = useParams();
  const { data, loading, notFound } = useData(
    () => api<IndustryPageData>(`/meta/industries/${encodeURIComponent(slug)}?country=${market}`),
    [slug, market],
  );
  usePageMeta(
    data ? `${data.industry.name} Jobs in the ${market} | Orbit Jobs` : undefined,
    data ? data.industry.intro.slice(0, 155) : undefined,
  );

  if (loading) return <div className="container" style={{ paddingTop: 48 }}><Skeletons n={4} /></div>;
  if (notFound || !data) return <NotFoundPage />;

  const i = data.industry;
  const m = (p: string) => mhref(market, p);

  return (
    <>
      <div className="hero"><div className="container" style={{ paddingTop: 56, paddingBottom: 44 }}>
        <h1 style={{ fontSize: "clamp(30px,4.4vw,48px)" }}>{i.name} jobs in the {market}</h1>
        <p className="muted"><strong>{data.total}</strong> live roles in {i.name}</p>
        <p className="hero-sub" style={{ maxWidth: "64ch" }}>{i.intro}</p>
        <div className="chips-row" style={{ marginTop: 16 }}>
          {i.roles.map((r) => <a key={r} className="chip" href={`${m("/jobs")}?q=${encodeURIComponent(r)}`}>{r}</a>)}
        </div>
      </div></div>
      <section className="band tight"><div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
          <h2>Live roles</h2><a className="arrow-link" href={`${m("/jobs")}?industry=${i.slug}`}>View all ›</a></div>
        <div className="tile-grid" style={{ marginTop: 16 }}>
          {data.jobs.length > 0
            ? data.jobs.map((j) => <JobCard key={j.id} j={j} />)
            : <p className="muted">No live roles right now — check back soon.</p>}
        </div>
      </div></section>
      <section className="band tight band-subtle"><div className="container">
        <h3>Explore other industries</h3>
        <div className="chips-row" style={{ marginTop: 12 }}>
          {data.others.map((o) => <a key={o.slug} className="chip neutral" href={m(`/industries/${o.slug}`)}>{o.name}</a>)}
        </div>
      </div></section>
      <PairedCTA market={market} />
    </>
  );
}
