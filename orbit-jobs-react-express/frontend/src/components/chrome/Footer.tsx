/** Site footer with the newsletter signup + cookie banner. */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/lib/client";
import { NAV_SPECIALISMS, mhref } from "@/lib/taxonomy";
import type { Market } from "@/lib/types";
import { Logo } from "@/lib/icons";
import { useToast } from "../providers";

export function Footer() {
  const pathname = useLocation().pathname || "/";
  const market: Market = pathname === "/us" || pathname.startsWith("/us/") ? "US" : "UK";
  const m = (p: string) => mhref(market, p);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [year, setYear] = useState(2026);
  useEffect(() => setYear(new Date().getFullYear()), []);

  return (
    <>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <a className="logo" href={market === "US" ? "/us" : "/"}><Logo /></a>
              <p className="small" style={{ marginTop: 16, maxWidth: "36ch" }}>The recruitment platform built by Orbit Tech Lab. Every job in one honest search — salaries shown, sources credited, employers direct.</p>
              <h4 style={{ marginTop: 24 }}>Job alerts, weekly</h4>
              <form className="footer-news" onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const r = await api<{ message: string }>("/newsletter", { method: "POST", body: { email } });
                  toast(r.message);
                  setEmail("");
                } catch (ex) { toast(ex instanceof Error ? ex.message : "Something went wrong", "err"); }
              }}>
                <input type="email" placeholder="you@email.co.uk" aria-label="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} />
                <button className="btn btn-primary btn-sm" type="submit">Sign up</button>
              </form>
            </div>
            <div><h4>Job seekers</h4><ul>
              <li><a href={m("/jobs")}>Search jobs</a></li><li><a href="/jobs/saved">Saved jobs</a></li>
              <li><a href="/alerts">Job alerts</a></li><li><a href="/candidates/upload-cv">Upload CV</a></li>
              <li><a href="/advice">Career advice</a></li><li><a href="/candidates/faqs">FAQs</a></li></ul></div>
            <div><h4>Employers</h4><ul>
              <li><a href="/employers">Why Orbit Jobs</a></li><li><a href="/employers/post-a-job">Post a job</a></li>
              <li><a href="/employers/dashboard">Employer dashboard</a></li><li><a href={m("/companies")}>Company profiles</a></li>
              <li><a href="/contact">Get in touch</a></li></ul></div>
            <div><h4>Specialisms</h4><ul className="cols-2">
              {NAV_SPECIALISMS.map(([s, n]) => <li key={s}><a href={m(`/specialisms/${s}`)}>{n}</a></li>)}</ul></div>
          </div>
          <div className="footer-bottom">
            <span>© {year} Orbit Jobs — an <strong style={{ color: "#9FD8CB", fontWeight: 600 }}>Orbit Tech Lab</strong> product. Demo build.</span>
            <span><a href="/">UK Jobs</a> · <a href="/us">US Jobs</a></span>
            <span className="legal">
              <a href="/legal/privacy">Privacy</a><a href="/legal/cookies">Cookies</a><a href="/legal/terms">Terms</a>
              <a href="/legal/acceptable-use">Acceptable use</a><a href="/legal/accessibility">Accessibility</a><a href="/sitemap-pages">Sitemap</a>
            </span>
          </div>
        </div>
      </footer>
      <CookieBanner />
    </>
  );
}

function CookieBanner() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!localStorage.getItem("oj.consent")) setOpen(true); }, []);
  if (!open) return null;
  const choose = (c: "accepted" | "rejected") => {
    localStorage.setItem("oj.consent", c);
    setOpen(false);
    toast(c === "accepted" ? "Thanks — analytics enabled." : "No problem — analytics stays off.");
  };
  return (
    <div className="cookie-banner open" role="dialog">
      <strong style={{ color: "var(--text-strong)" }}>Cookies, honestly.</strong>
      <p className="small" style={{ margin: "6px 0 0" }}>We use necessary cookies to run the site. Analytics only runs if you opt in — nothing fires before you choose.</p>
      <div className="cookie-actions">
        <button className="btn btn-sm btn-ghost" onClick={() => choose("rejected")}>Reject all</button>
        <button className="btn btn-sm btn-primary" onClick={() => choose("accepted")}>Accept all</button>
        <a className="small" style={{ alignSelf: "center" }} href="/legal/cookies">Preferences &amp; detail</a>
      </div>
    </div>
  );
}
