/** Candidate hub — how it works, featured jobs, testimonials. */
import { api } from "@/lib/client";
import { useData, usePageMeta } from "@/lib/hooks";
import type { PublicJob, Testimonial } from "@/lib/types";
import { JobCard } from "@/components/JobCard";
import { PairedCTA } from "@/components/PairedCTA";
import { IconCheck } from "@/lib/icons";

const Check = () => <IconCheck width={16} height={16} />;

export function CandidatesPage() {
  usePageMeta("For Job Seekers | Orbit Jobs", "One search across every source, honest salaries and alerts that only send new roles.");
  const { data } = useData(async () => {
    const [jobs, testimonials] = await Promise.all([
      api<{ results: PublicJob[] }>("/meta/latest-jobs?country=UK"),
      api<{ results: Testimonial[] }>("/meta/testimonials"),
    ]);
    return { jobs: jobs.results, testimonials: testimonials.results };
  }, []);

  return (
    <>
      <div className="hero"><div className="container" style={{ paddingTop: 56, paddingBottom: 52 }}>
        <span className="eyebrow">For candidates</span>
        <h1 style={{ maxWidth: "15ch", fontSize: "clamp(36px,4.8vw,58px)" }}>Job hunting is a job. <span className="hl-teal">We made it shorter.</span></h1>
        <p className="hero-sub">Stop tab-hopping between boards. Orbit pulls the UK market into one honest search — and tells you what everything pays.</p>
        <div className="hero-ctas" style={{ marginTop: 22 }}>
          <a className="btn btn-primary btn-lg" href="/jobs">Search jobs</a>
          <a className="btn btn-ink btn-lg" href="/candidates/upload-cv">Upload your CV</a></div>
      </div></div>

      <section className="band"><div className="container">
        <div className="section-head left">
          <span className="eyebrow reveal">How it works</span>
          <h2 className="reveal">Four steps, <span className="hl-orange">then it works for you.</span></h2>
        </div>
        <div className="steps">
          <div className="card step reveal"><h4>Search once</h4><p className="small" style={{ margin: 0 }}>Partner boards + direct employers, deduplicated, sources credited.</p></div>
          <div className="card step reveal"><h4>Save or apply</h4><p className="small" style={{ margin: 0 }}>60-second applies on direct roles. Hearts build your shortlist.</p></div>
          <div className="card step reveal"><h4>Track everything</h4><p className="small" style={{ margin: 0 }}>Statuses update as employers act. External applies loggable too.</p></div>
          <div className="card step reveal"><h4>Get alerted</h4><p className="small" style={{ margin: 0 }}>Only genuinely new roles. Unsubscribe is one click, always.</p></div>
        </div>
      </div></section>

      <section className="band tight band-subtle"><div className="container">
        <div className="split-2 even">
          <div>
            <span className="eyebrow reveal">Why Orbit</span>
            <h2 className="reveal">Built around your search, not our inbox</h2>
            <ul className="sol-list reveal">
              <li><Check />Salaries shown wherever they exist — and a one-tap &ldquo;disclosed only&rdquo; filter</li>
              <li><Check />Every source credited — partner listings link out, your click goes to whoever earned it</li>
              <li><Check />Application tracker that updates as employers act — external applies loggable too</li>
              <li><Check />Your data, your call — one-click GDPR export and deletion from your account</li>
            </ul>
            <div className="reveal" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><a className="btn btn-primary" href="/account/register">Create a free account</a><a className="btn btn-ghost" href="/candidates/faqs">Candidate FAQs</a></div>
          </div>
          <img className="photo-panel reveal" src="/media/img-search.webp" alt="A candidate browsing job categories and featured roles on a tablet" loading="lazy" />
        </div>
      </div></section>

      <section className="band tight"><div className="container">
        <div className="head-row">
          <div><span className="eyebrow reveal">Live now</span><h2 className="reveal">Featured this week</h2></div>
          <a className="arrow-link" href="/jobs">All jobs ›</a>
        </div>
        <div className="rail">{(data?.jobs || []).map((j) => <JobCard key={j.id} j={j} compact />)}</div>
      </div></section>

      <section className="band tight band-subtle"><div className="container">
        <div className="head-row">
          <div><span className="eyebrow reveal">Testimonials</span><h2 className="reveal">From people who switched</h2></div>
        </div>
        <div className="tile-grid">
          {(data?.testimonials || []).filter((t) => t.type === "candidate").slice(0, 4).map((t, i) => (
            <div key={i} className="card quote-card"><blockquote>&ldquo;{t.quote}&rdquo;</blockquote><div className="who"><strong>{t.name}</strong> · {t.role}</div></div>
          ))}
        </div>
      </div></section>

      <PairedCTA market="UK" />
    </>
  );
}
