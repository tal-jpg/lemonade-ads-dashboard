import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  'Signals with entry, stop loss and every take-profit level',
  'A moderated trading floor, courses and market news',
  'Store-verified subscriptions with a full audit trail',
];

const STATS: { value: string; accent?: string; label: string }[] = [
  { value: '4,281', label: 'Members' },
  { value: '68', accent: '%', label: 'Win rate · 30d' },
  { value: '24', accent: '/7', label: 'Desk coverage' },
];

function Tick() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function Login() {
  const { signIn, user, isAdmin, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user && isAdmin) return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // The error message is surfaced through the auth context.
    } finally {
      setSubmitting(false);
    }
  };

  const lockup = (
    <>
      <div className="brand-mark">FTH</div>
      <div className="name">
        Forex Trade <em>Hub</em>
      </div>
    </>
  );

  return (
    <div className="auth">
      {/* ------------------------------------------------ the product story */}
      <aside className="auth-brand">
        <div className="auth-chip auth-chip-1" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h4l3-8 4 16 3-8h6" />
          </svg>
        </div>
        <div className="auth-chip auth-chip-2" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19V9M10 19V5M16 19v-6M22 19H2" />
          </svg>
        </div>
        <div className="auth-chip auth-chip-3" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>

        <div className="auth-lockup">{lockup}</div>

        <h1 className="auth-title">
          Run the whole desk from <em>one place</em>.
        </h1>
        <p className="auth-lede">
          Signals, education, community and billing — every member-facing workflow is published,
          moderated and measured from this dashboard.
        </p>

        <ul className="auth-features">
          {FEATURES.map((feature) => (
            <li key={feature}>
              <span className="tick" aria-hidden="true">
                <Tick />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <div className="auth-stats">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="auth-stat-value">
                {stat.value}
                {stat.accent && <span>{stat.accent}</span>}
              </div>
              <div className="auth-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* -------------------------------------------------------- the form */}
      <main className="auth-form">
        <div className="auth-card">
          <div className="auth-lockup auth-card-lockup">{lockup}</div>

          <h2 className="auth-heading">Welcome back</h2>
          <p className="auth-sub">Sign in to your trading desk.</p>

          <form onSubmit={submit}>
            <div className="auth-fields">
              <div className="field">
                <label className="label" htmlFor="auth-email">
                  Email address
                </label>
                <input
                  id="auth-email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  placeholder="you@forextradehub.app"
                />
              </div>

              <div className="field">
                <label className="label" htmlFor="auth-password">
                  Password
                </label>
                <div className="pw-wrap">
                  <input
                    id="auth-password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                      {!showPassword && <path d="M4 20 20 4" />}
                    </svg>
                  </button>
                </div>
              </div>

              {error && <div className="error">{error}</div>}

              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign in'}
                {!submitting && (
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          <div className="auth-divider" />
          <p className="auth-note">
            Administrator access only — granted with the <code>admin</code> claim.
          </p>
        </div>
      </main>
    </div>
  );
}
