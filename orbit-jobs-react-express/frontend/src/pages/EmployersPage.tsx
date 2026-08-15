/** Employer hub — how it works, live stats, transparency pitch, pricing, testimonials. */
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import type { MarketStats, Testimonial } from "@/lib/types";
import { CountUp } from "@/components/RevealInit";
import { PairedCTA } from "@/components/PairedCTA";

export function EmployersPage() {
  usePageMeta("Hire With Orbit Jobs | Post a Job Free", "Post a job in under five minutes and manage applicants in one dashboard. Free at launch.");
  const { data } = useData(async () => {
    const [stats, testimonials] = await Promise.all([
      api<MarketStats>("/meta/stats?country=UK"),
      api<{ results: Testimonial[] }>("/meta/testimonials"),
    ]);
    return { stats, testimonials: testimonials.results };
  }, []);
  const stats = data?.stats;

  return (
    <>
      <div className="hero"><div className="container split-2" style={{ paddingTop: 56, paddingBottom: 52 }}>
        <div>
          <span className="eyebrow">For employers · free while we launch</span>
          <h1 style={{ maxWidth: "16ch", fontSize: "clamp(36px,4.6vw,54px)" }}>Hire across every field, <span className="hl-orange">without the enterprise faff</span></h1>
          <p className="hero-sub">Post in under five minutes. Your role sits beside — and outranks — the aggregated market, and applicants land in one clean dashboard.</p>
          <div className="hero-ctas" style={{ marginTop: 22 }}>
            <a className="btn btn-accent btn-lg" href="/employers/post-a-job">Post a job — free</a>
            <a className="btn btn-ghost btn-lg" href="#how">See how it works</a></div>
        </div>
        <img className="photo-panel" src="/media/img-team.webp" alt="A hiring manager presenting a hire, develop, grow together plan to their team" loading="lazy" />
      </div></div>

      <section className="band" id="how"><div className="container">
        <div className="section-head left">
          <span className="eyebrow reveal">How it works</span>
          <h2 className="reveal">Three steps <span className="hl-teal">to live.</span></h2>
        </div>
        <div className="steps">
          <div className="card step reveal"><h4>Create your account</h4><p className="small" style={{ margin: 0 }}>Company name, work email, done. A human reviews first postings — that&rsquo;s why candidates trust the board.</p></div>
          <div className="card step reveal"><h4>Post in minutes</h4><p className="small" style={{ margin: 0 }}>A three-step wizard with a house template, autosave, screening questions and a live preview.</p></div>
          <div className="card step reveal"><h4>Hire from one dashboard</h4><p className="small" style={{ margin: 0 }}>CVs, screening answers, statuses and CSV export. Candidates see honest status updates.</p></div>
        </div>
      </div></section>

      <section className="band tight band-subtle"><div className="container">
        <div className="stat-row">
          <div className="stat reveal"><div className="n"><em>{stats ? <CountUp value={stats.liveJobs} id="emp-stat-1" /> : "…"}</em></div><div className="c">Live roles candidates search beside yours</div></div>
          <div className="stat reveal"><div className="n">{stats ? <CountUp value={stats.employers} id="emp-stat-2" /> : "…"}</div><div className="c">Verified employers already posting</div></div>
          <div className="stat reveal"><div className="n"><em>{stats ? <CountUp value={stats.disclosedShare} suffix="%" id="emp-stat-3" /> : "…"}</em></div><div className="c">Listings showing salary — the trust bar</div></div>
        </div>
      </div></section>

      <section className="band"><div className="container split-2 even" id="transparency">
        <div>
          <span className="eyebrow reveal">Salary transparency</span>
          <h2 className="reveal">Publish the salary. <span className="hl-orange">Seriously.</span></h2>
          <p className="reveal">Listings with a published range get significantly more applications — and better-matched ones, because candidates self-select accurately. &ldquo;Competitive&rdquo; reads as &ldquo;below what you&rsquo;re imagining&rdquo;.</p>
          <p className="reveal small muted">The posting wizard nudges you with live data, and salary-transparent roles get preferred placement in salary-sorted results.</p>
        </div>
        <div className="card reveal nudge" style={{ padding: 28 }}>
          <strong>What candidates filter by on Orbit:</strong>
          <ul className="small" style={{ margin: "10px 0 0", paddingLeft: 18, lineHeight: 2 }}>
            <li>&ldquo;Only show jobs with disclosed salary&rdquo; — one tap</li>
            <li>Salary range slider (annual, day rate, hourly)</li>
            <li>Work model: on-site / hybrid / remote</li>
            <li>Posted date — freshness matters</li></ul>
        </div>
      </div></section>

      <section className="band tight band-subtle"><div className="container">
        <div className="section-head left">
          <span className="eyebrow reveal">Pricing</span>
          <h2 className="reveal">Pricing, honestly</h2>
        </div>
        <div className="tile-grid">
          <div className="card news-card reveal"><span className="jr-sector">Now · Launch</span><h4>Everything free</h4><p className="small" style={{ margin: 0 }}>Unlimited postings, applicant dashboard, company profile. We&rsquo;re building liquidity; you&rsquo;re building your team.</p></div>
          <div className="card news-card reveal"><span className="jr-sector">Later · Phase 3</span><h4>Paid plans arrive</h4><p className="small" style={{ margin: 0 }}>Featured listings and employer plans become paid. Standard postings stay affordable, with notice for existing employers.</p></div>
          <div className="card news-card reveal"><span className="jr-sector">Never</span><h4>The lines we won&rsquo;t cross</h4><p className="small" style={{ margin: 0 }}>Charging candidates. Selling CVs. Pretending partner listings are ours. Burying the salary question.</p></div>
        </div>
      </div></section>

      <section className="band tight"><div className="container">
        <div className="head-row">
          <div><span className="eyebrow reveal">Testimonials</span><h2 className="reveal">Employers on Orbit</h2></div>
        </div>
        <div className="tile-grid">
          {(data?.testimonials || []).filter((t) => t.type === "employer").map((t, i) => (
            <div key={i} className="card quote-card"><blockquote>&ldquo;{t.quote}&rdquo;</blockquote><div className="who"><strong>{t.name}</strong> · {t.role}, {t.company}</div></div>
          ))}
        </div>
      </div></section>

      <PairedCTA market="UK" />
    </>
  );
}
