/** Legal pages — privacy / cookies / terms / acceptable-use / accessibility. */
import { useParams } from "react-router-dom";
import { usePageMeta } from "@/lib/hooks";
import { NotFoundPage } from "./NotFoundPage";

const LEGAL: Record<string, [string, [string, string][]]> = {
  privacy: ["Privacy notice", [
    ["Who we are", "Orbit Jobs (“we”) runs a UK job platform. This demo notice mirrors the structure a production notice would carry: controller identity, contact route, and the promise that we never sell personal data."],
    ["What we collect", "Account details you give us (name, email, password), CVs and applications you submit, alerts you create, and — only with consent — analytics events. Aggregated listings contain no personal data."],
    ["Why we process it", "To run searches and applications you ask for (contract), to keep the platform safe (legitimate interest), and to send alerts and marketing you opted into (consent). Each form states its purpose at the point of capture."],
    ["Retention", "CVs are kept 12 months from your last activity, with a renewal email at 11 months. Applications are visible to the employer for 12 months, then anonymised. Deleted accounts are purged within 30 days."],
    ["Your rights", "Access, rectify, export and erase — the export and delete tools are self-service in your dashboard. Complaints go to the ICO; we'd appreciate the chance to fix things first."]]],
  cookies: ["Cookie policy", [
    ["Necessary cookies", "A session cookie keeps you signed in; a preference cookie remembers your consent choice and dismissed banners. These run the site and cannot be switched off."],
    ["Analytics", "Off by default. If you choose “Accept all”, a privacy-first analytics tool records anonymous usage events. “Reject all” is honoured everywhere, permanently, and is exactly as easy to click."],
    ["Changing your mind", "Clear the site's cookies or revisit this page — the banner reappears whenever no choice is stored."]]],
  terms: ["Terms of use", [
    ["The service", "Orbit Jobs lists jobs from partner sources and direct employers. We work to keep listings accurate and current, but the hiring decision — and the contract of employment — is always between you and the employer."],
    ["Accounts", "Keep your credentials to yourself; you're responsible for activity under your account. We may suspend accounts that abuse the platform or other users."],
    ["Listings", "Aggregated listings are credited to their source and link there to apply. Employers posting directly warrant their listings are genuine, lawful and non-discriminatory."],
    ["Liability", "The service is provided as-is for this demo. In production this section carries the usual limitations, governed by the law of England and Wales."]]],
  "acceptable-use": ["Acceptable use — employer posting rules", [
    ["Genuine jobs only", "Every posting must be a real, currently open role with the hiring company identified. No perpetual pipeline ads, no bait-and-switch."],
    ["No discrimination", "Requirements must comply with the Equality Act 2010. Listings may not state or imply preference on protected characteristics."],
    ["No fees to candidates", "Roles requiring candidates to pay — for training, kit, or “admin” — are removed and the account reviewed. Commission-only roles must say so in the salary line."],
    ["No MLM or misleading schemes", "Multi-level marketing, unpaid “trial shifts” dressed as jobs, and undisclosed franchise buy-ins are not accepted."],
    ["Enforcement", "First strike: listing removed with reasons. Repeat or severe: account closed. Candidates can report any listing in one click."]]],
  accessibility: ["Accessibility statement", [
    ["Our target", "WCAG 2.2 AA across the platform: semantic landmarks, full keyboard operation, visible focus, labelled controls, announced result updates, and no information carried by colour alone."],
    ["Known gaps", "This demo build has not had a full manual screen-reader audit; automated checks run in development. Production launch requires the manual pass in the build checklist."],
    ["Feedback", "If something doesn't work with your setup, tell us via the contact page — accessibility reports jump the support queue."]]],
};

export function LegalPage() {
  const { page = "" } = useParams();
  const item = LEGAL[page];
  usePageMeta(item ? `${item[0]} | Orbit Jobs` : undefined);
  if (!item) return <NotFoundPage />;
  return (
    <div className="container legal-body" style={{ paddingTop: 48 }}>
      <p className="caption">Legal · Last updated 11 August 2026</p>
      <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>{item[0]}</h1>
      <nav className="small" style={{ margin: "16px 0 8px" }}>
        {item[1].map((s, i) => <a key={i} href={`#s${i}`} style={{ marginRight: 14 }}>{s[0]}</a>)}
      </nav>
      {item[1].map((s, i) => (
        <div key={i}><h3 id={`s${i}`}>{s[0]}</h3><p>{s[1]}</p></div>
      ))}
    </div>
  );
}
