import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/client";
import { IconChevR } from "@/lib/icons";
import { roleHome, useToast, useUser } from "@/components/providers";
import type { PublicUser } from "@/lib/types";

export function RegisterView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();
  const { user, ready, refreshSession } = useUser();
  const [role, setRole] = useState<string>(params.get("as") || "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "", companyName: "", website: "", marketing: false });

  useEffect(() => {
    if (ready && user) navigate(roleHome(user), { replace: true });
  }, [ready, user, navigate]);

  return (
    <div className="container" style={{ paddingTop: 56 }}>
      <div className="split-2" style={{ alignItems: "start" }}>
        <div>
          {!role ? (
            <div style={{ textAlign: "center" }}>
              <span className="eyebrow">Create account</span>
              <h1 style={{ fontSize: "clamp(32px,4vw,46px)" }}>Create your <span className="hl-teal">free account</span></h1>
              <p className="muted" style={{ margin: "0 auto 32px" }}>Two flavours — pick yours.</p>
              <div className="paired" style={{ textAlign: "left" }}>
                <button className="card role-card" onClick={() => setRole("candidate")}>
                  <span className="jr-sector">For candidates</span>
                  <h3 style={{ margin: 0 }}>I&rsquo;m looking for a job</h3>
                  <p className="small muted" style={{ margin: 0 }}>Saved jobs, tracking, alerts and one-click applies with a stored CV.</p>
                  <span className="jr-arrow" aria-hidden="true"><IconChevR /></span></button>
                <button className="card role-card" onClick={() => setRole("employer")}>
                  <span className="jr-sector" style={{ color: "var(--accent-600)" }}>For employers</span>
                  <h3 style={{ margin: 0 }}>I&rsquo;m hiring</h3>
                  <p className="small muted" style={{ margin: 0 }}>Post jobs free at launch and manage applicants in one dashboard.</p>
                  <span className="jr-arrow" aria-hidden="true"><IconChevR /></span></button>
              </div>
            </div>
          ) : (
            <div>
              <span className="eyebrow">Create account</span>
              <h1 style={{ fontSize: 30 }}>{role === "employer" ? "Create your employer account" : "Create your account"}</h1>
              <p className="muted">
                {role === "employer"
                  ? "Post your first job in minutes. First postings are quickly reviewed by a human — that's how the platform stays trustworthy."
                  : "Saved jobs, application tracking and alerts that only send genuinely new roles."}
              </p>
              <form className="card" style={{ padding: 32, marginTop: 16 }} noValidate onSubmit={async (e) => {
                e.preventDefault();
                setErr("");
                setBusy(true);
                try {
                  const { user: u } = await api<{ user: PublicUser }>("/auth/register", { method: "POST", body: { role, ...f } });
                  toast("Welcome to Orbit Jobs!");
                  await refreshSession();
                  window.location.href = role === "employer" ? "/employers/post-a-job" : roleHome(u);
                } catch (ex) {
                  setErr(ex instanceof Error ? ex.message : "Registration failed");
                  setBusy(false);
                }
              }}>
                {role === "employer" && (
                  <div className="form-grid">
                    <div className="field"><label className="f-label" htmlFor="rg-company">Company name</label>
                      <input id="rg-company" placeholder="Type your company name" value={f.companyName} onChange={(e) => setF({ ...f, companyName: e.target.value })} /></div>
                    <div className="field"><label className="f-label" htmlFor="rg-website">Company website</label>
                      <input id="rg-website" type="url" placeholder="https://" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
                      <p className="f-hint">A work email matching your website speeds up verification.</p></div>
                  </div>
                )}
                <div className="form-grid">
                  <div className="field"><label className="f-label" htmlFor="rg-name">Your name</label>
                    <input id="rg-name" autoComplete="name" required placeholder="Type your full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
                  <div className="field"><label className="f-label" htmlFor="rg-email">Email</label>
                    <input id="rg-email" type="email" autoComplete="email" required placeholder="Type your email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
                </div>
                <div className="field"><label className="f-label" htmlFor="rg-pass">Password</label>
                  <input id="rg-pass" type="password" autoComplete="new-password" required placeholder="At least 8 characters" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                  <p className="f-hint">At least 8 characters.</p></div>
                {role === "candidate" && <p className="small muted">You can add a CV after signing up — it unlocks one-click applies.</p>}
                <div className="field checkbox"><input type="checkbox" id="rg-mkt" checked={f.marketing} onChange={(e) => setF({ ...f, marketing: e.target.checked })} /><label htmlFor="rg-mkt">Send me relevant roles and product updates (optional).</label></div>
                <p className="caption">By creating an account you agree to the <a href="/legal/terms" target="_blank">terms</a> and <a href="/legal/privacy" target="_blank">privacy notice</a>.</p>
                {err && <div className="f-error">{err}</div>}
                <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
              </form>
            </div>
          )}
        </div>
        <img className="photo-panel m-hide" src="/media/img-handshake.webp" alt="A recruiter and candidate shaking hands across an interview table" loading="lazy" style={{ position: "sticky", top: 110 }} />
      </div>
    </div>
  );
}
