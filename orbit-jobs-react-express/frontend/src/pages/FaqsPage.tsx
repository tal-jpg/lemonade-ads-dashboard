/** Candidate FAQs (+ FAQPage JSON-LD). */
import { JsonLd, usePageMeta } from "@/lib/hooks";
import { PairedCTA } from "@/components/PairedCTA";

const FAQS: [string, string][] = [
  ["Is Orbit Jobs free for job seekers?", "Completely. Searching, applying, saving, alerts and the talent pool are free — and will stay free. Employers fund the platform (from Phase 3)."],
  ["Where do the jobs come from?", "Two places: employers who post directly to Orbit, and partner job boards whose listings we aggregate with permission. Partner listings always show a “via” badge and link to the source to apply — we never pretend someone else's listing is ours."],
  ["Why do some jobs not show a salary?", "Because the employer or source didn't disclose one. We show “Salary not disclosed” honestly rather than guessing — and the “salary disclosed only” filter lets you skip them entirely. Employers posting on Orbit are actively nudged to publish ranges."],
  ["Do I need an account to apply?", "No. Direct roles take under a minute with no account. An account adds tracking (see when an employer views or shortlists you), saved jobs across devices, and alerts."],
  ["How do alerts work?", "You save a search; we email new matches at your chosen frequency — instant, daily or weekly. Only genuinely new, deduplicated roles are sent, and unsubscribe is one click in every email."],
  ["What happens to my CV?", "It's stored privately, shared only with employers you apply to (or matched from the talent pool with your consent), kept for 12 months with a renewal reminder, and deleted on request — export and deletion are self-service in your dashboard."],
  ["A listing looks wrong or dodgy — what do I do?", "Use “Report listing” on the job page. Reports are reviewed within one working day; listings that break our rules (discrimination, candidate fees, MLM) are removed and the employer reviewed."],
];

export function FaqsPage() {
  usePageMeta("Candidate FAQs | Orbit Jobs", "How Orbit Jobs works for job seekers.");
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
  return (
    <>
      <JsonLd data={ld} />
      <div className="hero"><div className="container" style={{ paddingTop: 52, paddingBottom: 44 }}>
        <span className="eyebrow">FAQs</span>
        <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)" }}>Questions, <span className="hl-teal">answered.</span></h1>
        <p className="hero-sub">Straight answers about how the platform works.</p>
      </div></div>
      <div className="container" style={{ marginTop: 36 }}>
        <div className="split-2" style={{ alignItems: "start" }}>
          <div>
            {FAQS.map(([q, a], i) => (
              <details key={i} className="faq-item" open={i === 0}>
                <summary>{q}</summary><p className="small">{a}</p>
              </details>
            ))}
          </div>
          <img className="photo-panel m-hide" src="/media/img-search.webp" alt="A candidate browsing job categories and featured roles on a tablet" loading="lazy" style={{ position: "sticky", top: 110 }} />
        </div>
      </div>
      <div className="container" style={{ maxWidth: 860, marginTop: 40, textAlign: "center" }}>
        <p className="muted">Still stuck? <a className="arrow-link" href="/contact">Get in touch — we reply within one working day ›</a></p>
      </div>
      <PairedCTA market="UK" />
    </>
  );
}
