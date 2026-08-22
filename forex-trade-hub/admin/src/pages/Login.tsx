import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Field } from '../components/ui';

export function Login() {
  const { signIn, user, isAdmin, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand" style={{ justifyContent: 'center', paddingBottom: 26 }}>
          <div className="brand-mark">FTH</div>
          <div>
            <div className="brand-name">Forex Trade Hub</div>
            <div className="brand-sub">Admin dashboard</div>
          </div>
        </div>

        <form className="card" onSubmit={submit}>
          <h1 style={{ fontSize: 18, margin: '0 0 4px' }}>Sign in</h1>
          <p className="hint" style={{ margin: '0 0 18px' }}>
            Administrator access only.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Email">
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </Field>

            <Field label="Password">
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
              />
            </Field>

            {error && <div className="error">{error}</div>}

            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>

        <p className="hint" style={{ textAlign: 'center', marginTop: 18 }}>
          Admin access is granted with the <code>admin</code> custom claim. See
          docs/ADMIN_SETUP.md.
        </p>
      </div>
    </div>
  );
}
