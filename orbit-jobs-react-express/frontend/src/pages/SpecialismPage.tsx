/** Specialism landing page: intro, live feed, salary snapshot, titles, FAQs (+ FAQPage JSON-LD). */
import { useParams } from "react-router-dom";
import { api } from "@/lib/client";
import { JsonLd, useData, usePageMeta } from "@/lib/hooks";
import { faqPageLD } from "@/lib/seo";
import { money } from "@/lib/format";
import { SEN_NAMES, mhref } from "@/lib/taxonomy";
import type { Market, SpecialismPageData } from "@/lib/types";
import { JobCard, Skeletons } from "@/components/JobCard";
import { AlertButton } from "@/components/views/JobDetailClient";
import { PairedCTA } from "@/components/PairedCTA";
import { IconChevD, IconChevR } from "@/lib/icons";
import { NotFoundPage } from "./NotFoundPage";

export function SpecialismPage({ market }: { market: Market }) {
  const { slug = "" } = useParams();
  const { data, loading, notFound } = useData(
    () => api<SpecialismPageData>(`/meta/specialisms/${encodeURIComponent(slug)}?country=${market}`),
    [slug, market],
  );
  usePageMeta(
    data ? `${data.specialism.name} Jobs in the ${market} | Orbit Jobs` : undefined,
    data ? data.specialism.intro.slice(0, 155) : undefined,
  );

  if (loading) return <div className="container" style={{ paddingTop: 48 }}><Skeletons n={4} /></div>;
  if (notFound || !data) return <NotFoundPage />;

  const s = data.specialism;
  const m = (p: string) => mhref(market, p);

  return (
    <>
      <JsonLd data={faqPageLD(s.faqs)} />
      <div className="hero" style={{ background: `linear-gradient(180deg, ${s.tint}, rgba(255,255,255,0))` }}>
        <div className="container" style={{ paddingTop: 56, paddingBottom: 44 }}>
          <h1 style={{ fontSize: "clamp(30px,4.4vw,48px)" }}>{s.name} jobs across the {market}</h1>
          <p className="muted"><strong>{data.total}</strong> live {s.name.toLowerCase()} roles · updated today</p>
          <p className="hero-sub" style={{ maxWidth: "64ch" }}>{s.intro}</p>
          <div className="hero-ctas" style={{ marginTop: 18 }}>
            <a className="btn btn-primary" href={`${m("/jobs")}?specialism=${s.slug}`}>Search these jobs</a>
            <AlertButton filters={{ specialism: s.slug }} label={s.name + " jobs"} market={market}>🔔 Alert me about new roles</AlertButton>
          </div>
        </div>
      </div>
      <section className="band tight"><div className="container">
        <h2>Live roles</h2>
        <div className="tile-grid" style={{ marginTop: 16 }}>
          {data.jobs.map((j) => <JobCard key={j.id} j={j} />)}
        </div>
        {data.total > data.jobs.length && (
          <p style={{ marginTop: 18 }}>
            <a className="arrow-link" href={`${m("/jobs")}?specialism=${s.slug}`}>View all {data.total} {s.name} jobs <IconChevR /></a>
          </p>
        )}
      </div></section>
      {data.snapshot.length > 0 && (
        <section className="band tight band-subtle"><div className="container">
          <h2>What {s.name.toLowerCase()} pays right now</h2>
          <p className="muted small">Median advertised salaries from live listings on Orbit Jobs — not estimates.</p>
          <div className="table-scroll"><table className="data">
            <thead><tr><th>Level</th><th>Median advertised salary</th><th>Sample</th></tr></thead>
            <tbody>
              {data.snapshot.map((r) => (
                <tr key={r.tier}>
                  <td>{SEN_NAMES[r.tier] || r.tier}</td>
                  <td><strong>{money(r.median, market === "US" ? "USD" : "GBP")}</strong> a year</td>
                  <td className="muted">{r.sample} live roles</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div></section>
      )}
      <section className="band tight"><div className="container">
        <h2>Popular job titles</h2>
        <p className="muted small">What these roles actually involve in the {market} market.</p>
        <div className="tile-grid" style={{ marginTop: 16 }}>
          {s.popularTitles.map((t, i) => (
            <div key={i} className="card"><h4>{t.t}</h4><p className="small" style={{ margin: 0 }}>{t.d}</p></div>
          ))}
        </div>
        {data.companies.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3>Hiring {s.name.toLowerCase()} on Orbit Jobs</h3>
            <div className="chips-row">{data.companies.map((c) => <span key={c} className="chip neutral">{c}</span>)}</div>
          </div>
        )}
      </div></section>
      <section className="band tight band-subtle"><div className="container" style={{ maxWidth: 820 }}>
        <h2>Questions people ask</h2>
        <div style={{ marginTop: 12 }}>
          {s.faqs.map((f, i) => (
            <details key={i} className="filter-group" open={i === 0}>
              <summary>{f.q} <IconChevD /></summary>
              <p className="small" style={{ paddingTop: 10 }}>{f.a}</p>
            </details>
          ))}
        </div>
      </div></section>
      <PairedCTA market={market} />
    </>
  );
}
