/** Site chrome: announcement bar, header with mega menu + market tabs, mobile drawer. */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/client";
import { NAV_SPECIALISMS, mhref } from "@/lib/taxonomy";
import type { Article, Market } from "@/lib/types";
import { IconChevD, IconChevR, IconHeart, IconMenu, IconUser, IconX, Logo } from "@/lib/icons";
import { roleHome, useUser } from "../providers";

const SCOPED = ["/jobs", "/specialisms", "/industries", "/companies"];
const NEUTRAL = ["/jobs/saved"];

function switchHref(market: Market, pathname: string, target: Market): string {
  const bare = market === "US" ? pathname.replace(/^\/us/, "") || "/" : pathname;
  const scoped = bare === "/" || (SCOPED.some((sec) => bare === sec || bare.startsWith(sec + "/")) && !NEUTRAL.some((n) => bare === n));
  if (target === "US") return scoped ? ("/us" + (bare === "/" ? "" : bare)) || "/us" : "/us";
  return scoped ? (bare || "/") : "/";
}

export function Header() {
  const pathname = useLocation().pathname || "/";
  const navigate = useNavigate();
  const market: Market = pathname === "/us" || pathname.startsWith("/us/") ? "US" : "UK";
  const m = (p: string) => mhref(market, p);
  const { user, saves, openQuickCV } = useUser();

  const [announceOpen, setAnnounceOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaArticles, setMegaArticles] = useState<Omit<Article, "body">[] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSub, setDrawerSub] = useState(false);

  useEffect(() => {
    const dis = localStorage.getItem("oj.announce");
    if (!dis || Date.now() - Number(dis) > 14 * 864e5) setAnnounceOpen(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem("oj.market", market);
  }, [market]);

  useEffect(() => {
    if (megaOpen && !megaArticles) {
      api<{ results: Omit<Article, "body">[] }>("/meta/articles")
        .then(({ results }) => setMegaArticles(results))
        .catch(() => setMegaArticles([]));
    }
    if (!megaOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".mega, #mega-btn")) setMegaOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMegaOpen(false); };
    document.addEventListener("click", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", close); document.removeEventListener("keydown", esc); };
  }, [megaOpen, megaArticles]);

  useEffect(() => {
    document.body.classList.toggle("drawer-open", drawerOpen);
    if (!drawerOpen) setDrawerSub(false);
  }, [drawerOpen]);

  // close overlays on navigation
  useEffect(() => { setDrawerOpen(false); setMegaOpen(false); }, [pathname]);

  const accountHref = user ? roleHome(user) : "/account";
  const signinLabel = user ? user.name.split(" ")[0] : "Sign in";
  const signinHref = user ? roleHome(user) : "/account/login";

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      {announceOpen && (
        <div className="announce">
          <div className="container">
            <span>🎉 Orbit Jobs is live — every listing free for employers while we launch.</span>
            <a href="/employers">Post a job</a>
            <button aria-label="Dismiss announcement" onClick={() => { setAnnounceOpen(false); localStorage.setItem("oj.announce", String(Date.now())); }}>×</button>
          </div>
        </div>
      )}
      <header className={"site-header" + (scrolled ? " scrolled" : "")} id="site-header">
        <div className="nav-shell">
          <div className="nav-row">
            <a className="logo" href={market === "US" ? "/us" : "/"}><Logo /></a>
            <nav className="main-nav" aria-label="Primary">
              <a href={m("/jobs")}>Job search</a>
              <button id="mega-btn" aria-expanded={megaOpen} aria-controls="mega" onClick={() => setMegaOpen(!megaOpen)}>Specialisms <IconChevD /></button>
              <a href="/employers">For employers</a>
              <a href="/advice">Advice</a>
              <a href="/about">Who we are</a>
            </nav>
            <div className="util">
              <nav className="market-tabs hide-m" aria-label="Market">
                <a className={"market-tab" + (market === "UK" ? " active" : "")} aria-current={market === "UK" || undefined} href={switchHref(market, pathname, "UK")}>UK</a>
                <a className={"market-tab" + (market === "US" ? " active" : "")} aria-current={market === "US" || undefined} href={switchHref(market, pathname, "US")}>US</a>
              </nav>
              <span className="market-soon caption">{market === "US" ? "Pay shown in USD" : ""}</span>
              <a className="icon-btn hide-m" href="/jobs/saved" aria-label="Saved jobs">
                <IconHeart />
                {saves.size > 0 && <span className="badge-count" id="saved-count">{saves.size}</span>}
              </a>
              <a className="icon-btn hide-m" href={accountHref} aria-label="Your account"><IconUser /></a>
              <a className="signin-link" href={signinHref}>{signinLabel}</a>
              <a className="btn btn-sm btn-ink hide-m" href="/employers/post-a-job">Post a job</a>
              <button className="btn btn-sm btn-primary" onClick={openQuickCV}>Upload CV</button>
              <button className="icon-btn hamburger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}><IconMenu /></button>
            </div>
          </div>
          <div className={"mega" + (megaOpen ? " open" : "")} id="mega">
            <div className="mega-inner">
              <div>
                <div className="mega-cols">
                  {NAV_SPECIALISMS.map(([s, n]) => <a key={s} href={m(`/specialisms/${s}`)}>{n}</a>)}
                </div>
                <p style={{ margin: "16px 0 0", display: "flex", gap: 22, flexWrap: "wrap" }}>
                  <a className="arrow-link" href={m("/jobs")}>Browse all jobs <IconChevR /></a>
                  <a className="arrow-link" href={m("/companies")}>Browse companies <IconChevR /></a>
                </p>
              </div>
              <aside className="mega-aside">
                <div className="kicker">Latest advice</div>
                <div id="mega-articles">
                  {(megaArticles || []).slice(0, 2).map((a) => (
                    <a key={a.slug} className="mega-article" href={`/advice/article/${a.slug}`}>
                      <span className="t">{a.title}</span><br /><span className="c">{a.minutes} min read</span>
                    </a>
                  ))}
                </div>
                <a className="arrow-link small" href="/advice">View all <IconChevR /></a>
              </aside>
            </div>
          </div>
        </div>
      </header>
      <div className="drawer-scrim" onClick={() => setDrawerOpen(false)} />
      <aside className={"drawer" + (drawerSub ? " subview" : "")} aria-label="Menu">
        <div className="drawer-head">
          <a className="logo" href={market === "US" ? "/us" : "/"}><Logo /></a>
          <button className="icon-btn" aria-label="Close menu" onClick={() => setDrawerOpen(false)}><IconX /></button>
        </div>
        <div className="drawer-market">
          <a className={market === "US" ? "chip neutral" : "chip"} href={switchHref(market, pathname, "UK")}>UK Jobs</a>
          <a className={market === "US" ? "chip" : "chip neutral"} href={switchHref(market, pathname, "US")}>US Jobs</a>
        </div>
        <div className="drawer-search">
          <form role="search" onSubmit={(e) => {
            e.preventDefault();
            const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim();
            setDrawerOpen(false);
            navigate(m("/jobs") + (q ? "?q=" + encodeURIComponent(q) : ""));
          }}><input type="search" name="q" placeholder="Search jobs…" aria-label="Search jobs" /></form>
        </div>
        <nav className="drawer-nav">
          <div className="drawer-root">
            <a href={m("/jobs")}>Job search</a>
            <button onClick={() => setDrawerSub(true)}>Specialisms <IconChevR /></button>
            <a href={m("/companies")}>Companies</a>
            <a href="/employers">For employers</a>
            <a href="/advice">Advice</a>
            <a href="/jobs/saved">Saved jobs</a>
            <a href={accountHref}>Your account</a>
            <a href="/about">Who we are</a>
            <a href="/contact">Get in touch</a>
          </div>
          <div className="drawer-sub">
            <button style={{ color: "var(--brand-600)", fontWeight: 600 }} onClick={() => setDrawerSub(false)}>‹ Back</button>
            {NAV_SPECIALISMS.map(([s, n]) => <a key={s} href={m(`/specialisms/${s}`)}>{n}</a>)}
          </div>
        </nav>
        <div className="drawer-foot">
          <a className="btn btn-primary" href={signinHref}>{user ? "Your dashboard" : "Sign in"}</a>
          <button className="btn btn-ghost" onClick={() => { setDrawerOpen(false); openQuickCV(); }}>Upload your CV</button>
        </div>
      </aside>
    </>
  );
}
