import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/client";
import { Logo } from "@/lib/icons";
import { roleHome, useToast, useUser } from "@/components/providers";
import type { PublicUser } from "@/lib/types";

export function LoginView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const { user, ready, refreshSession } = useUser();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) navigate(params.get("next") || roleHome(user), { replace: true });
  }, [ready, user, navigate, params]);

  async function submit(e2?: string, p2?: string) {
    setErr("");
    setBusy(true);
    try {
      const { user: u } = await api<{ user: PublicUser }>("/auth/login", {
        method: "POST",
        body: { email: e2 ?? email, password: p2 ?? pass },
      });
      await refreshSession();
      window.location.href = params.get("next") || roleHome(u);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Sign-in failed");
      setBusy(false);
    }
  }

  return (
    <div className="auth-split">
      <div className="auth-left">
        <a className="logo" href="/"><Logo /></a>
        <span className="eyebrow" style={{ marginTop: 44 }}>Your account</span>
        <h2 style={{ fontSize: "clamp(30px,3vw,42px)", maxWidth: "13ch" }}>Get more from <span style={{ color: "#66D6BE" }}>the hunt.</span></h2>
        <div className="auth-benefit"><span className="ic">♥</span><div><div className="t">Saved jobs &amp; shortlists</div><div className="c">Heart a role on your phone, apply from your laptop.</div></div></div>
        <div className="auth-benefit"><span className="ic">▤</span><div><div className="t">Application tracking</div><div className="c">See when employers view and shortlist you.</div></div></div>
        <div className="auth-benefit"><span className="ic">◔</span><div><div className="t">Alerts that respect you</div><div className="c">Only genuinely new roles. One-click unsubscribe.</div></div></div>
        <img className="photo-panel" src="/media/img-network.webp" alt="Hiring teams talking in an office overlooking the city at sunset" loading="lazy" style={{ marginTop: 36, maxWidth: 420, borderRadius: 20, borderColor: "rgba(255,255,255,.16)" }} />
      </div>
      <div className="auth-right"><div className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1 style={{ fontSize: 24, textTransform: "uppercase", letterSpacing: ".05em" }}>Sign in</h1>
        <form noValidate style={{ marginTop: 18 }} onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="field"><label className="f-label" htmlFor="lg-email">Email</label>
            <input id="lg-email" type="email" autoComplete="email" required placeholder="Type your email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field"><label className="f-label" htmlFor="lg-pass">Password</label>
            <input id="lg-pass" type="password" autoComplete="current-password" required placeholder="Type your password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <p className="f-hint"><label className="checkbox" style={{ display: "inline-flex" }}><input type="checkbox" defaultChecked /> Keep me signed in on this device</label></p></div>
          {err && <div className="f-error">{err}</div>}
          <button className="btn btn-primary" style={{ width: "100%" }} type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
          <button className="btn btn-ghost" style={{ width: "100%", marginTop: 10 }} type="button" onClick={() => toast("Demo: in production this emails you a one-tap sign-in link.")}>Email me a sign-in link instead</button>
          <p className="small" style={{ textAlign: "center", marginTop: 16 }}>New here? <a href="/account/register">Create an account</a></p>
          <div className="card" style={{ marginTop: 20, padding: 16, background: "var(--surface-subtle)" }}>
            <p className="caption" style={{ margin: "0 0 8px" }}><strong>Demo accounts</strong> — one click:</p>
            <div style={{ display: "grid", gap: 6 }}>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => submit("amelia@demo.orbitjobs.example", "demo1234")}>Candidate — Amelia</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => submit("priya@thameslogistics.example", "demo1234")}>Employer — Priya (Thames Logistics)</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => submit("admin@orbitjobs.example", "admin1234")}>Admin — Sam</button>
            </div></div>
        </form>
      </div></div>
    </div>
  );
}
