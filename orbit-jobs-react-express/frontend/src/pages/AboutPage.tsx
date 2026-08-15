/** About page — mission, values, live stats, roadmap, studio, team. */
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import type { MarketStats } from "@/lib/types";
import { CountUp } from "@/components/RevealInit";
import { PairedCTA } from "@/components/PairedCTA";

export function AboutPage() {
  usePageMeta("About | Orbit Jobs", "Why we built one honest place for every UK job.");
  const { data: stats } = useData(() => api<MarketStats>("/meta/stats?country=UK"), []);

  return (
    <>
      <div className="hero"><div className="container" style={{ paddingTop: 56, paddingBottom: 52 }}>
        <span className="eyebrow">Who we are</span>
        <h1 style={{ maxWidth: "16ch", fontSize: "clamp(36px,5vw,60px)" }}>One honest place for every job</h1>
        <p className="hero-sub">Job searching meant six tabs, duplicate listings and &ldquo;competitive salary&rdquo;. We thought all three were fixable.</p>
      </div></div>

      <section className="band tight"><div className="container">
        <div className="section-head">
          <span className="eyebrow reveal">Our mission</span>
          <h2 className="reveal" style={{ maxWidth: "22ch", marginLeft: "auto", marginRight: "auto" }}>Connecting <span className="hl-teal">great people</span> with the teams where they&rsquo;ll do their <span className="hl-orange">best work.</span></h2>
        </div>
      </div></section>

      <section className="band tight"><div className="container">
        <div className="split-2 even">
          <div>
            <span className="eyebrow reveal">The idea</span>
            <h2 className="reveal">Nothing pretends to be what it isn&rsquo;t</h2>
            <p className="reveal">Orbit Jobs aggregates listings from partner boards — with permission, credited, linking back to apply — and pairs them with roles employers post directly. One search covers the market.</p>
            <p className="reveal muted">Built country-aware from day one, the same platform now runs two markets — UK and US — with identical functionality and zero cross-market bleed.</p>
          </div>
          <img className="photo-panel reveal" src="/media/img-network.webp" alt="Recruiters and hiring teams talking in an office overlooking the city at sunset" loading="lazy" />
        </div>
      </div></section>

      <section className="band tight band-subtle"><div className="container">
        <div className="section-head left">
          <span className="eyebrow reveal">Our values</span>
          <h2 className="reveal">The three promises</h2>
        </div>
        <div className="tile-grid">
          <div className="card news-card reveal"><span className="jr-sector">Promise 01</span><h4>Salaries shown</h4><p className="small" style={{ margin: 0 }}>Wherever they exist, prominently. Employers who publish ranges do better here — by design.</p></div>
          <div className="card news-card reveal"><span className="jr-sector">Promise 02</span><h4>Sources credited</h4><p className="small" style={{ margin: 0 }}>Partner listings say &ldquo;via&rdquo; and link out. Your click belongs to whoever earned the listing.</p></div>
          <div className="card news-card reveal"><span className="jr-sector">Promise 03</span><h4>Alerts that respect you</h4><p className="small" style={{ margin: 0 }}>Only new roles, deduplicated, one-click unsubscribe. Email you&rsquo;d actually keep.</p></div>
        </div>
      </div></section>

      <section className="band tight"><div className="container">
        <div className="stat-row">
          <div className="stat reveal"><div className="n"><em>{stats ? <CountUp value={stats.liveJobs} id="ab-1" /> : "…"}</em></div><div className="c">Live UK jobs</div></div>
          <div className="stat reveal"><div className="n">{stats ? <CountUp value={stats.sources} id="ab-2" /> : "…"}</div><div className="c">Sources in one search</div></div>
          <div className="stat reveal"><div className="n">{stats ? <CountUp value={stats.employers} id="ab-3" /> : "…"}</div><div className="c">Verified direct employers</div></div>
        </div>
      </div></section>

      <section className="band tight"><div className="container">
        <div className="section-head left">
          <span className="eyebrow reveal">The journey</span>
          <h2 className="reveal">Where we are, where we&rsquo;re going</h2>
        </div>
        <div className="timeline">
          <div className="tl-item done reveal"><span className="tl-phase">Phase 1 · Live</span><h4>UK launch</h4><p className="small" style={{ margin: 0 }}>Four partner boards, direct employers, honest search with full salary filters.</p></div>
          <div className="tl-item done reveal"><span className="tl-phase">Phase 2 · Live</span><h4>US Jobs tab</h4><p className="small" style={{ margin: 0 }}>A second market with identical functionality — USD pay, state rules, visa filters.</p></div>
          <div className="tl-item next reveal"><span className="tl-phase">Phase 3 · Next</span><h4>Salary tools &amp; following</h4><p className="small" style={{ margin: 0 }}>Salary benchmarks, company following and more. The promises stay the same.</p></div>
        </div>
      </div></section>

      <section className="band band-inverse">
        <span style={{ position: "absolute", width: 560, height: 560, border: "1.5px solid rgba(255,255,255,.06)", borderRadius: 999, top: -240, right: -160, pointerEvents: "none" }} />
        <div className="container split-2">
          <div>
            <span className="eyebrow reveal">The studio</span>
            <h2 className="reveal">Built by Orbit Tech Lab</h2>
            <p className="reveal" style={{ maxWidth: "54ch" }}>Orbit Jobs is designed, shipped and run by <strong style={{ color: "#9FD8CB" }}>Orbit Tech Lab</strong> — a software studio that builds its own products, from everyday online tools to complete business platforms.</p>
            <a className="btn btn-ghost reveal" href="https://orbittechlab.com" target="_blank" rel="noopener">Visit orbittechlab.com ↗</a>
          </div>
          <div className="reveal" style={{ display: "grid", gap: 12 }}>
            <div className="card" style={{ background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.12)", boxShadow: "none", padding: "18px 22px" }}><strong style={{ color: "#fff" }}>ToolOrbit</strong><span className="small" style={{ color: "var(--text-inverse-muted)" }}> — 77+ fast, privacy-first online tools, all in your browser.</span></div>
            <div className="card" style={{ background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.12)", boxShadow: "none", padding: "18px 22px" }}><strong style={{ color: "#fff" }}>CampusCore</strong><span className="small" style={{ color: "var(--text-inverse-muted)" }}> — all-in-one school management across five role-based portals.</span></div>
            <div className="card" style={{ background: "rgba(255,255,255,.05)", borderColor: "rgba(255,255,255,.12)", boxShadow: "none", padding: "18px 22px" }}><strong style={{ color: "#fff" }}>Repliva</strong><span className="small" style={{ color: "var(--text-inverse-muted)" }}> — one inbox for every messaging channel, with AI replies.</span></div>
          </div>
        </div>
      </section>

      <section className="band tight"><div className="container">
        <div className="section-head left">
          <span className="eyebrow reveal">The team</span>
          <h2 className="reveal">Small team, strong opinions</h2>
        </div>
        <div className="split-2 even" style={{ alignItems: "center" }}>
          <img className="photo-panel reveal" src="/media/img-team.webp" alt="The team planning hiring together at a whiteboard that reads hire, develop, grow together" loading="lazy" />
          <div style={{ display: "grid", gap: 14 }}>
            <div className="card team-card reveal"><span className="tc-ava">JB</span><div><h4 style={{ margin: "0 0 2px" }}>Jordan Blake</h4><span className="tl-phase">Product &amp; engineering</span></div><p className="small" style={{ margin: 0 }}>Owns the search, the pipeline and the promise that duplicates die before you see them.</p></div>
            <div className="card team-card reveal"><span className="tc-ava">SR</span><div><h4 style={{ margin: "0 0 2px" }}>Sasha Reid</h4><span className="tl-phase">Partnerships</span></div><p className="small" style={{ margin: 0 }}>Signs the partner boards and keeps every listing credited to whoever earned it.</p></div>
            <div className="card team-card reveal"><span className="tc-ava">EV</span><div><h4 style={{ margin: "0 0 2px" }}>Elliot Vance</h4><span className="tl-phase">Candidate success</span></div><p className="small" style={{ margin: 0 }}>Reads every report, answers every accessibility email, guards the alert quality bar.</p></div>
          </div>
        </div>
      </div></section>

      <PairedCTA market="UK" />
    </>
  );
}
