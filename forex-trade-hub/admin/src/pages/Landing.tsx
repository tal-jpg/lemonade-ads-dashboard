import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Public landing page — the site's front door.
 *
 * Marketing only: it reads no Firestore and renders for signed-out visitors,
 * so it stays outside the admin guard. The two jobs it has are sending members
 * to the app and sending staff to the dashboard.
 */

/** Overridable so the link can change without a code change once the listing is live. */
const PLAY_STORE_URL =
  import.meta.env.VITE_PLAY_STORE_URL ||
  'https://play.google.com/store/apps/details?id=com.forextradehub.app';

const FEATURES = [
  {
    title: 'Signals with the full picture',
    body: 'Entry, stop loss and every take-profit level, with the technical and fundamental read behind the trade — not just an alert.',
    icon: <path d="M2 12h4l3-8 4 16 3-8h6" />,
  },
  {
    title: 'A private trading floor',
    body: 'A moderated community with daily discussion, polls and session reviews. Every member is approved before they can post.',
    violet: true,
    icon: <path d="M21 12a8 8 0 1 1-3.2-6.4L21 4l-1 4.3A8 8 0 0 1 21 12z" />,
  },
  {
    title: 'Learn the way pros trade',
    body: 'A structured course library from the basics through SMC and ICT, plus risk management and trading psychology.',
    icon: (
      <>
        <path d="M4 4h7v16H4z" />
        <path d="M13 4h7v16h-7z" />
      </>
    ),
  },
  {
    title: 'Levels stay premium',
    body: 'Premium setups are unreadable to free accounts at the database level — locked previews never carry a tradable number.',
    violet: true,
    icon: (
      <>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
  },
];

const STATS = [
  { value: '4,281', label: 'Members' },
  { value: '68', accent: '%', label: 'Win rate · 30d' },
  { value: '24', accent: '/7', label: 'Desk coverage' },
  { value: '58', label: 'Lessons published' },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

function StoreButton({ className = 'btn btn-store' }: { className?: string }) {
  return (
    <a className={className} href={PLAY_STORE_URL} target="_blank" rel="noreferrer noopener">
      <svg className="glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M4 2.6v18.8c0 .5.5.8.9.6l13.4-9.4c.4-.3.4-.9 0-1.2L4.9 2C4.5 1.8 4 2.1 4 2.6z" />
      </svg>
      <span className="stack">
        <small>Android</small>
        Download the app
      </span>
    </a>
  );
}

export function Landing() {
  const lockup = (
    <>
      <div className="brand-mark">FTH</div>
      <div className="name">
        Forex Trade <em>Hub</em>
      </div>
    </>
  );

  return (
    <div className="lp">
      {/* ------------------------------------------------------------- nav */}
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <div className="lp-brand">{lockup}</div>

          <nav className="lp-links">
            <a href="#features">Features</a>
            <a href="#app">The app</a>
            <a href="#download">Download</a>
          </nav>

          <div className="lp-nav-actions">
            <Link className="btn" to="/login">
              Log in
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ hero */}
      <section className="lp-hero">
        <div className="lp-wrap lp-hero-inner">
          <div>
            <span className="lp-eyebrow">
              <b>New</b> Signals, education and community in one app
            </span>

            <h1 className="lp-title">
              Trade with the <em>full picture</em>.
            </h1>
            <p className="lp-lede">
              Forex Trade Hub publishes every setup with its entry, stop loss and targets — plus the
              analysis behind it, a moderated trading floor, and a course library that takes you from
              the basics to SMC and ICT.
            </p>

            <div className="lp-cta">
              <StoreButton />
              <a className="btn btn-secondary" href="#features">
                See what's inside
              </a>
            </div>
            <p className="lp-cta-note">Free plan available · No card required to start</p>
          </div>

          {/* a small, honest preview of the product rather than a stock image */}
          <div className="lp-device" aria-hidden="true">
            <div className="lp-screen">
              <div className="row">
                <div>
                  <div className="greet">Good morning</div>
                  <div className="who">Alex</div>
                </div>
                <span className="badge badge-premium">Premium</span>
              </div>

              <div className="lp-mini">
                <div className="row">
                  <span className="pair">XAU/USD</span>
                  <span className="badge badge-profit">Buy</span>
                </div>
                <div className="lp-levels">
                  <div>
                    <span>Entry</span>
                    <b>2412.50</b>
                  </div>
                  <div>
                    <span>Stop</span>
                    <b style={{ color: 'var(--danger)' }}>2398.00</b>
                  </div>
                  <div>
                    <span>Target</span>
                    <b style={{ color: 'var(--success)' }}>2431.00</b>
                  </div>
                </div>
              </div>

              <div className="lp-mini" style={{ borderLeftColor: 'var(--danger)' }}>
                <div className="row">
                  <span className="pair">GBP/JPY</span>
                  <span className="badge badge-loss">Sell</span>
                </div>
                <div className="lp-levels">
                  <div>
                    <span>Entry</span>
                    <b>193.40</b>
                  </div>
                  <div>
                    <span>Stop</span>
                    <b style={{ color: 'var(--danger)' }}>194.10</b>
                  </div>
                  <div>
                    <span>Target</span>
                    <b style={{ color: 'var(--success)' }}>192.20</b>
                  </div>
                </div>
              </div>

              <div className="row" style={{ marginTop: 2 }}>
                <span className="badge badge-primary">Daily brief</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Updated 08:14</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="lp-section" id="features">
        <div className="lp-wrap">
          <div className="lp-head">
            <div className="lp-kicker">What you get</div>
            <h2 className="lp-h2">Everything the desk publishes, in one place</h2>
            <p className="lp-sub">
              One membership covers the signal feed, the community and the whole course library.
            </p>
          </div>

          <div className="lp-grid">
            {FEATURES.map((feature) => (
              <article className={`lp-feature${feature.violet ? ' violet' : ''}`} key={feature.title}>
                <div className="ico">
                  <Icon>{feature.icon}</Icon>
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- stats */}
      <section className="lp-section" id="app">
        <div className="lp-wrap">
          <div className="lp-stats">
            {STATS.map((stat) => (
              <div className="lp-stat" key={stat.label}>
                <div className="v">
                  {stat.value}
                  {stat.accent && <span>{stat.accent}</span>}
                </div>
                <div className="l">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- download */}
      <section className="lp-section" id="download">
        <div className="lp-wrap">
          <div className="lp-download">
            <div className="lp-kicker">Get the app</div>
            <h2 className="lp-h2">Signals arrive the moment they're published</h2>
            <p className="lp-sub" style={{ margin: '12px auto 0', maxWidth: '52ch' }}>
              Push alerts for every new setup and trade update, the full community, and your course
              progress synced across devices.
            </p>
            <div className="lp-cta">
              <StoreButton />
              <Link className="btn btn-secondary" to="/login">
                Staff sign-in
              </Link>
            </div>
            <p className="lp-cta-note">Android available now · iOS in review</p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- footer */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-inner">
            <span className="copy">© {new Date().getFullYear()} Forex Trade Hub</span>
            <nav>
              <a href="#features">Features</a>
              <a href="#download">Download</a>
              <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer noopener">
                Google Play
              </a>
              <Link to="/login">Staff login</Link>
            </nav>
          </div>
          <p className="lp-risk">
            Trading foreign exchange carries a high level of risk and may not be suitable for every
            investor. All content is educational and informational only, is not investment advice,
            and no profit is guaranteed. Past performance does not guarantee future results.
          </p>
        </div>
      </footer>
    </div>
  );
}
