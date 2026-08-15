/** Human-readable sitemap. */
import { usePageMeta } from "@/lib/hooks";
import { NAV_SPECIALISMS } from "@/lib/taxonomy";

export function SitemapPage() {
  usePageMeta("Sitemap | Orbit Jobs", "Every section of Orbit Jobs.");
  return (
    <div className="container" style={{ maxWidth: 820, paddingTop: 48 }}>
      <h1>Sitemap</h1>
      <div className="tile-grid" style={{ marginTop: 20 }}>
        <div className="card"><h4>Job seekers</h4><ul className="small" style={{ lineHeight: 2.2, paddingLeft: 18, margin: 0 }}>
          <li><a href="/jobs">Job search</a></li><li><a href="/jobs/saved">Saved jobs</a></li><li><a href="/alerts">Job alerts</a></li>
          <li><a href="/candidates">Candidate hub</a></li><li><a href="/candidates/upload-cv">Upload CV</a></li><li><a href="/candidates/faqs">FAQs</a></li>
          <li><a href="/advice">Career advice</a></li><li><a href="/account">Your dashboard</a></li></ul></div>
        <div className="card"><h4>Employers</h4><ul className="small" style={{ lineHeight: 2.2, paddingLeft: 18, margin: 0 }}>
          <li><a href="/employers">Employer hub</a></li><li><a href="/employers/post-a-job">Post a job</a></li>
          <li><a href="/employers/dashboard">Dashboard</a></li><li><a href="/companies">Companies</a></li></ul></div>
        <div className="card"><h4>Specialisms</h4><ul className="small" style={{ lineHeight: 2.2, paddingLeft: 18, margin: 0 }}>
          {NAV_SPECIALISMS.map(([s, n]) => <li key={s}><a href={`/specialisms/${s}`}>{n}</a></li>)}</ul></div>
        <div className="card"><h4>Company &amp; legal</h4><ul className="small" style={{ lineHeight: 2.2, paddingLeft: 18, margin: 0 }}>
          <li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li>
          <li><a href="/legal/privacy">Privacy</a></li><li><a href="/legal/cookies">Cookies</a></li>
          <li><a href="/legal/terms">Terms</a></li><li><a href="/legal/acceptable-use">Acceptable use</a></li>
          <li><a href="/legal/accessibility">Accessibility</a></li></ul></div>
      </div>
    </div>
  );
}
