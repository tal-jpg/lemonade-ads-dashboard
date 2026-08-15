/** Home page — stats, latest jobs, testimonials and advice load from the API. */
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import { NAV_SPECIALISMS, UK_CITY_SUGGESTIONS, US_CITY_SUGGESTIONS, mhref } from "@/lib/taxonomy";
import type { Article, Market, MarketStats, PublicJob, Testimonial } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import { CountUp } from "@/components/RevealInit";
import { HeroVideo } from "@/components/HeroVideo";
import { IconCheck } from "@/lib/icons";

const MARQUEE = ["NovaBank", "Thames Logistics", "Meridian Media", "Kelpie Energy", "Harper & Vale", "Plumline", "Ferrocast Engineering", "Hudson Analytics", "BrightCare Group", "Fintor", "Cascade Renewables", "Beacon Hill Legal"];

const SPEC_DOTS: Record<string, [string, string]> = {
  technology: ["#DCEBE2", "T"], "finance-and-accounting": ["#F4E3CD", "F"], sales: ["#EDE6D3", "S"],
  marketing: ["#DCEBE2", "M"], engineering: ["#F4E3CD", "E"], healthcare: ["#EDE6D3", "H"],
  "human-resources": ["#DCEBE2", "HR"], "operations-and-supply-chain": ["#F4E3CD", "O"], legal: ["#EDE6D3", "L"],
  "customer-experience": ["#DCEBE2", "CX"], education: ["#F4E3CD", "Ed"], construction: ["#EDE6D3", "C"],
};

function Check() {
  return <IconCheck width={16} height={16} />;
}

export function HomePage({ market }: { market: Market }) {
  const navigate = useNavigate();
  usePageMeta(
    market === "US" ? "Every US job, one search | Orbit Jobs" : "Every UK job, one search | Orbit Jobs",
    market === "US"
      ? "Orbit Jobs brings US jobs from every major source into one fast, honest search — pay ranges shown, sources credited, employers direct."
      : "Orbit Jobs — the recruitment platform by Orbit Tech Lab. Every UK job from every major source in one fast, honest search — salaries shown, sources credited, employers direct.",
  );

  const { data } = useData(async () => {
    const [stats, latest, testimonials, articles] = await Promise.all([
      api<MarketStats>(`/meta/stats?country=${market}`),
      api<{ results: PublicJob[] }>(`/meta/latest-jobs?country=${market}`),
      api<{ results: Testimonial[] }>("/meta/testimonials"),
      api<{ results: Omit<Article, "body">[] }>("/meta/articles"),
    ]);
    return { stats, latest: latest.results, testimonials: testimonials.results, articles: articles.results };
  }, [market]);

  const stats = data?.stats;
  const m = (p: string) => mhref(market, p);
  const cities = market === "US" ? US_CITY_SUGGESTIONS : UK_CITY_SUGGESTIONS;

  return (
    <>
      <div className="hero hero-video">
        <HeroVideo />
        <div className="hero-shade" aria-hidden="true" />
        <div className="container">
          <div className="hero-inner">
            <span className="hero-kicker"><span>{stats ? `${stats.liveJobs} live ${market} roles · updated today` : `Live ${market} roles · updated today`}</span></span>
            <h1>Sourcing the <span className="hl-teal">best</span> people for the world&rsquo;s most <span className="hl-orange">ambitious</span> teams.</h1>
            <p className="hero-sub">
              {market === "US"
                ? "Every US job from the boards you'd check anyway — plus roles posted straight to Orbit — in one honest search. Pay ranges shown wherever they exist."
                : "Every UK job from the boards you'd check anyway — plus roles posted straight to Orbit — in one honest search. Salaries shown wherever they exist."}
            </p>
            <form className="search-bar" role="search" onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const q = (f.elements.namedItem("q") as HTMLInputElement).value.trim();
              const loc = (f.elements.namedItem("loc") as HTMLInputElement).value.trim();
              const p = new URLSearchParams();
              if (q) p.set("q", q);
              if (loc) p.set("loc", loc);
              navigate(m("/jobs") + (p.toString() ? "?" + p : ""));
            }}>
              <input name="q" type="search" placeholder="Job title, skill or company" aria-label="Keywords" />
              <input name="loc" type="text" placeholder="City or region" aria-label="Location" list="home-cities" />
              <datalist id="home-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
              <button className="btn btn-primary btn-lg" type="submit">Search jobs</button>
            </form>
            <div className="hero-ctas">
              <a className="btn btn-light btn-lg" href="/employers">Explore solutions</a>
              <a className="btn btn-primary btn-lg" href={m("/jobs")}>Browse job board</a>
            </div>
            <div className="hero-trust">
              <span>Hiring? <a href="/employers/post-a-job">Post a job free</a></span>
              <span>·</span>
              <span>Not ready? <a href="/candidates/upload-cv">Drop your CV</a></span>
              <span>·</span>
              <span><strong>Salaries shown</strong> wherever they exist</span>
            </div>
          </div>
        </div>
        <div className="hero-live" aria-hidden="true">
          <span className="dot" />
          <div><strong>{stats ? `${stats.liveJobs} live roles · ${stats.sources} sources` : "Live roles · one search"}</strong><span>✓ Salaries shown up front</span></div>
        </div>
      </div>

      <div className="marquee-band" aria-hidden="true">
        <div className="container">
          <div className="marquee-label">Trusted by hiring teams across the UK &amp; US</div>
          <div className="marquee"><div className="marquee-track">
            {MARQUEE.map((c) => <span key={c}>{c}</span>)}
            {MARQUEE.map((c) => <span key={c + "2"}>{c}</span>)}
          </div></div>
        </div>
      </div>

      <section className="band tight"><div className="container">
        <div className="stat-row">
          <div className="stat reveal"><div className="n"><em>{stats ? <CountUp value={stats.liveJobs} id="stat-jobs" /> : "…"}</em></div><div className="c">Live {market} jobs right now</div></div>
          <div className="stat reveal"><div className="n">{stats ? <CountUp value={stats.sources} id="stat-sources" /> : "…"}</div><div className="c">Sources in one search</div></div>
          <div className="stat reveal"><div className="n">{stats ? <CountUp value={stats.addedRecently} id="stat-new" /> : "…"}</div><div className="c">Added in the last 48 hours</div></div>
          <div className="stat reveal"><div className="n"><em>{stats ? <CountUp value={stats.disclosedShare} suffix="%" id="stat-salary" /> : "…"}</em></div><div className="c">Listings showing salary</div></div>
        </div>
      </div></section>

      <section className="band band-subtle"><div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">Our specialisms</span>
          <h2 className="reveal">Twelve fields. <span className="hl-orange">One orbit.</span></h2>
          <p className="reveal">Technical and non-technical, entry to executive — every family has its own live feed, salary data and guides.</p>
        </div>
        <div className="tile-grid">
          {NAV_SPECIALISMS.map(([slug, name]) => (
            <a key={slug} className="spec-tile reveal" href={m(`/specialisms/${slug}`)}>
              <span className="spec-dot" style={{ background: SPEC_DOTS[slug][0] }}>{SPEC_DOTS[slug][1]}</span>
              <span><span className="t">{name}</span><br /><span className="c">Browse live roles</span></span>
            </a>
          ))}
        </div>
      </div></section>

      <section className="band"><div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">Solutions</span>
          <h2 className="reveal">One platform, <span className="hl-teal">both sides</span> of the table.</h2>
          <p className="reveal">Whether you&rsquo;re making your next move or building the team that ships the next thing — Orbit keeps it honest, fast and transparent.</p>
        </div>
        <div className="solutions">
          <div className="solution-card reveal">
            <span className="sol-ring" />
            <img className="sol-photo" src="/media/img-search.webp" alt="A candidate browsing job categories and featured roles on a tablet" loading="lazy" />
            <span className="s-kicker">For candidates</span>
            <h3>Find work that fits your orbit</h3>
            <ul className="sol-list">
              <li><Check />One search across every major board, plus direct employers</li>
              <li><Check />Salaries shown wherever they exist — filter to disclosed only</li>
              <li><Check />60-second applies on direct roles, no account needed</li>
              <li><Check />Alerts that only send genuinely new, deduplicated roles</li>
            </ul>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn btn-primary" href={m("/jobs")}>Search jobs</a><a className="btn btn-ghost" href="/candidates">How it works</a></div>
          </div>
          <div className="solution-card dark reveal">
            <span className="sol-ring" />
            <img className="sol-photo" src="/media/img-team.webp" alt="A hiring manager presenting a hire, develop, grow together plan to their team" loading="lazy" />
            <span className="s-kicker">For employers</span>
            <h3>Hire without the enterprise faff</h3>
            <ul className="sol-list">
              <li><Check />Post in under five minutes — free while we launch</li>
              <li><Check />Your role sits beside, and above, the aggregated market</li>
              <li><Check />Applicants, screening answers and CVs in one dashboard</li>
              <li><Check />Human-reviewed listings — that&rsquo;s why candidates trust us</li>
            </ul>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn btn-accent" href="/employers/post-a-job">Post a job — free</a><a className="btn btn-ghost" href="/employers">For employers</a></div>
          </div>
        </div>
      </div></section>

      <section className="band band-subtle"><div className="container">
        <div className="section-head left" style={{ marginBottom: 52 }}>
          <span className="eyebrow reveal">How Orbit works</span>
          <h2 className="reveal">Three steps, <span className="hl-orange">zero friction.</span></h2>
        </div>
        <div className="steps">
          <div className="card step reveal"><h4>Search everything</h4><p className="small" style={{ margin: 0 }}>One query covers partner boards and direct employers. Duplicates merged, sources always credited.</p></div>
          <div className="card step reveal"><h4>Filter to exactly you</h4><p className="small" style={{ margin: 0 }}>Salary range, work model, seniority, posted date — and a one-tap &ldquo;salary disclosed only&rdquo; toggle.</p></div>
          <div className="card step reveal"><h4>Apply without friction</h4><p className="small" style={{ margin: 0 }}>Direct roles take under 60 seconds, no account needed. Partner roles link straight to the source.</p></div>
        </div>
      </div></section>

      <section className="band tight"><div className="container">
        <div className="head-row">
          <div><span className="eyebrow reveal">Latest roles</span><h2 className="reveal">Fresh today</h2></div>
          <a className="arrow-link" href={m("/jobs")}>View all jobs ›</a>
        </div>
        <div className="tile-grid">
          {(data?.latest || []).map((j) => <JobCard key={j.id} j={j} />)}
        </div>
      </div></section>

      <section className="band band-inverse">
        <span style={{ position: "absolute", width: 640, height: 640, border: "1.5px solid rgba(255,255,255,.06)", borderRadius: 999, top: -280, right: -200, pointerEvents: "none" }} />
        <span style={{ position: "absolute", width: 420, height: 420, border: "1.5px dashed rgba(159,216,203,.14)", borderRadius: 999, bottom: -190, left: -120, pointerEvents: "none" }} />
        <div className="container split-2">
          <div>
            <span className="eyebrow reveal">For hiring teams</span>
            <h2 className="reveal">Hiring? Reach candidates across every field.</h2>
            <p className="reveal" style={{ maxWidth: "52ch" }}>Post in minutes, free while we launch. Your role appears beside — and above — the aggregated market, with applicants managed in one dashboard.</p>
            <div className="reveal" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
              <a className="btn btn-primary btn-lg" href="/employers/post-a-job">Post a job — free</a>
              <a className="btn btn-ghost btn-lg" href="/employers">See how it works</a></div>
          </div>
          <div className="reveal" style={{ position: "relative" }}>
            <img className="photo-panel" src="/media/img-network.webp" alt="Hiring teams talking in an office overlooking the city at sunset" loading="lazy" />
            <div className="card" style={{ position: "absolute", left: 18, right: 18, bottom: 18, background: "rgba(13,26,22,.82)", borderColor: "rgba(255,255,255,.16)", boxShadow: "0 18px 44px rgba(6,14,12,.45)", backdropFilter: "blur(6px)", padding: "20px 24px" }}>
              <p className="small" style={{ color: "var(--text-inverse)", margin: 0 }}>&ldquo;The job was live the same morning and the applicant view is honestly better than the enterprise tool I used at my last company.&rdquo;</p>
              <p className="caption" style={{ color: "var(--text-inverse-muted)", margin: "10px 0 0" }}>Priya S. · HR Manager, Thames Logistics</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band"><div className="container">
        <div className="head-row">
          <div><span className="eyebrow reveal">Testimonials</span><h2 className="reveal">What people say</h2></div>
        </div>
        <div className="rail">
          {(data?.testimonials || []).map((t, i) => (
            <div key={i} className="card quote-card"><blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
              <div className="who"><strong>{t.name}</strong> · {t.role}{t.company ? ", " + t.company : ""} · <span className={"chip" + (t.type === "employer" ? " accent" : "")} style={{ fontSize: 11 }}>{t.type}</span></div></div>
          ))}
        </div>
      </div></section>

      <section className="band tight band-subtle"><div className="container">
        <div className="head-row">
          <div><span className="eyebrow reveal">From the blog</span><h2 className="reveal">Career advice that isn&rsquo;t filler</h2></div>
          <a className="arrow-link" href="/advice">All guides ›</a>
        </div>
        <div className="tile-grid">
          {(data?.articles || []).slice(0, 3).map((a) => (
            <a key={a.slug} className="card" href={`/advice/article/${a.slug}`}>
              <span className="chip neutral">{a.topic}</span>
              <h4 style={{ margin: "12px 0 6px" }}>{a.title}</h4>
              <p className="small muted" style={{ margin: 0 }}>{a.excerpt.slice(0, 110)}… · {a.minutes} min</p></a>
          ))}
        </div>
      </div></section>

      <section className="big-cta"><div className="container">
        <img className="photo-panel reveal" src="/media/img-handshake.webp" alt="A recruiter and candidate shaking hands across an interview table" loading="lazy" style={{ maxWidth: 840, margin: "0 auto 44px" }} />
        <span className="eyebrow reveal">Get started</span>
        <h2 className="reveal">Ready for your <span className="hl-teal">next orbit?</span></h2>
        <p className="reveal">Search every source in one place, drop your CV into the talent pool, or put your open role in front of candidates across twelve fields.</p>
        <div className="reveal" style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <a className="btn btn-primary btn-lg" href={m("/jobs")}>Browse the job board</a>
          <a className="btn btn-ink btn-lg" href="/employers/post-a-job">Post a job</a>
          <a className="btn btn-ghost btn-lg" href="/candidates/upload-cv">Upload your CV</a>
        </div>
      </div></section>
    </>
  );
}
