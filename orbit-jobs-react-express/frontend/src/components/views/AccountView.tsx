/** Candidate dashboard: tracker, shortlist, alerts, profile + CV, GDPR self-service. */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { timeAgo } from "@/lib/format";
import type { Alert, CV, PublicJob } from "@/lib/types";
import { JobCard, Skeletons } from "@/components/JobCard";
import { CVFileInput } from "@/components/CVFileInput";
import { useToast, useUser } from "@/components/providers";

interface AppRow {
  id: string; status: string; appliedAt: string; external: boolean;
  job: { id: string; slug: string; title: string; companyName: string; status: string } | null;
}
interface ProfileData {
  name: string; email: string;
  profile: { phone?: string; desiredSalary?: number | null; noticePeriod?: string; workModel?: string | null };
  cvs: CV[];
}

export function AccountView() {
  const { user, ready, signInGate, refreshSession } = useUser();
  const toast = useToast();
  const [apps, setApps] = useState<AppRow[] | null>(null);
  const [saves, setSaves] = useState<{ job: PublicJob }[] | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const cvRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [a, s, al, p] = await Promise.all([
      api<{ results: AppRow[] }>("/me/applications"),
      api<{ results: { job: PublicJob }[] }>("/me/saves"),
      api<{ results: Alert[] }>("/me/alerts"),
      api<ProfileData>("/me/profile"),
    ]);
    setApps(a.results); setSaves(s.results); setAlerts(al.results); setProfile(p);
  }, []);

  useEffect(() => {
    if (ready && user?.role === "candidate") load();
  }, [ready, user, load]);

  useEffect(() => {
    if (ready && user && user.role !== "candidate") {
      window.location.href = user.role === "employer" ? "/employers/dashboard" : "/admin";
    }
  }, [ready, user]);

  if (!ready) return <div className="container" style={{ paddingTop: 64 }}><Skeletons n={2} /></div>;

  if (!user) {
    return (
      <div className="container" style={{ maxWidth: 640, paddingTop: 64 }}>
        <div className="empty card"><div className="ring-illo" /><h2>Your dashboard</h2>
          <p className="muted">Saved jobs, applications, alerts and your CV — in one place.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={async () => { if (await signInGate()) window.location.reload(); }}>Sign in</button>
            <a className="btn btn-ghost" href="/account/register">Create account</a></div></div>
      </div>
    );
  }
  if (user.role !== "candidate") return null;

  return (
    <>
      <div className="hero job-hero"><div className="container split-2" style={{ alignItems: "center" }}>
        <div>
          <span className="eyebrow" style={{ marginTop: 26 }}>Your dashboard</span>
          <h1 className="job-title" style={{ fontSize: "clamp(30px,3.8vw,46px)", marginBottom: 24 }}>Hi {user.name.split(" ")[0]} 👋</h1>
          <div className="kpis" style={{ margin: 0 }}>
            <div className="kpi"><div className="n">{saves?.length ?? "…"}</div><div className="c">Saved jobs</div></div>
            <div className="kpi"><div className="n">{apps?.length ?? "…"}</div><div className="c">Applications</div></div>
            <div className="kpi"><div className="n">{alerts ? alerts.filter((a) => a.active).length : "…"}</div><div className="c">Active alerts</div></div>
          </div>
        </div>
        <img className="photo-panel m-hide" src="/media/img-search.webp" alt="A candidate browsing job categories and featured roles on a tablet" loading="lazy" />
      </div></div>
      <div className="container" style={{ paddingTop: 40 }}>
        <section>
          <div className="head-row" style={{ marginBottom: 16 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Tracker</span><h2 style={{ fontSize: 26, margin: 0 }}>Your applications</h2></div></div>
          {!apps ? <Skeletons n={2} /> : apps.length ? (
            <div className="table-scroll"><table className="data">
              <thead><tr><th>Role</th><th>Status</th><th>Applied</th><th></th></tr></thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td><strong style={{ color: "var(--text-strong)" }}>{a.job ? a.job.title : "(removed)"}</strong><br /><span className="caption">{a.job?.companyName || ""}{a.external ? " · applied on partner site" : ""}</span></td>
                    <td><span className={`pill ${a.status}`}>{a.status === "submitted" ? "Submitted" : a.status === "viewed" ? "Viewed by employer" : a.status[0].toUpperCase() + a.status.slice(1)}</span></td>
                    <td className="caption">{timeAgo(a.appliedAt)}</td>
                    <td>{a.job && a.job.status === "live" ? <a className="btn btn-sm btn-ghost" href={`/jobs/${a.job.slug}`}>View job</a> : <span className="caption">closed</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : <p className="muted">No applications tracked yet — apply to a direct job or log an external one.</p>}
        </section>

        <section style={{ marginTop: 48 }}>
          <div className="head-row" style={{ marginBottom: 16 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Shortlist</span><h2 style={{ fontSize: 26, margin: 0 }}>Saved jobs</h2></div><a className="arrow-link" href="/jobs/saved">Manage ›</a></div>
          <div className="results-list">
            {!saves ? <Skeletons n={2} /> : saves.length ? saves.slice(0, 3).map((r) => <JobCard key={r.job.id} j={r.job} compact />) : <p className="muted">Nothing saved yet.</p>}
          </div>
        </section>

        <section style={{ marginTop: 48 }}>
          <div className="head-row" style={{ marginBottom: 10 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Alerts</span><h2 style={{ fontSize: 26, margin: 0 }}>Job alerts</h2></div><a className="arrow-link" href="/alerts">Manage ›</a></div>
          <p className="small muted">{alerts?.length ? alerts.map((a) => a.name).join(" · ") : "No alerts yet — create one from any search."}</p>
        </section>

        {profile && (
          <section style={{ marginTop: 48, maxWidth: 680 }}>
            <div className="head-row" style={{ marginBottom: 16 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Profile</span><h2 style={{ fontSize: 26, margin: 0 }}>Profile &amp; CV</h2></div></div>
            <form className="card" style={{ padding: 28 }} onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const val = (id: string) => (form.querySelector<HTMLInputElement | HTMLSelectElement>("#" + id)?.value ?? "");
              await api("/me/profile", { method: "PATCH", body: { phone: val("pf-phone"), desiredSalary: val("pf-salary"), noticePeriod: val("pf-notice"), workModel: val("pf-model") } });
              toast("Profile saved");
            }}>
              <div className="form-grid">
                <div className="field"><label className="f-label" htmlFor="pf-phone">Phone</label><input id="pf-phone" defaultValue={profile.profile.phone || ""} /></div>
                <div className="field"><label className="f-label" htmlFor="pf-salary">Desired salary (£/year)</label><input id="pf-salary" type="number" defaultValue={profile.profile.desiredSalary || ""} /></div>
                <div className="field"><label className="f-label" htmlFor="pf-notice">Notice period</label><input id="pf-notice" defaultValue={profile.profile.noticePeriod || ""} placeholder="e.g. 1 month" /></div>
                <div className="field"><label className="f-label" htmlFor="pf-model">Preferred work model</label>
                  <select id="pf-model" defaultValue={profile.profile.workModel || ""}>
                    {["", "on-site", "hybrid", "remote"].map((mo) => <option key={mo} value={mo}>{mo || "No preference"}</option>)}
                  </select></div>
              </div>
              <button className="btn btn-primary btn-sm">Save profile</button>
            </form>
            <div className="card" style={{ padding: 24, marginTop: 14 }}>
              <h4>Your CV</h4>
              <div>
                {(profile.cvs || []).length ? profile.cvs.map((c) => (
                  <p key={c.file} className="small">📄 {c.original} {c.primary && <span className="chip" style={{ fontSize: 11 }}>primary</span>}{" "}
                    <button className="btn btn-sm btn-danger" onClick={async () => { await api("/me/cv/" + c.file, { method: "DELETE" }); load(); }}>Remove</button></p>
                )) : <p className="small muted">No CV stored — upload one for one-click applies.</p>}
              </div>
              <CVFileInput inputRef={cvRef} />
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={async () => {
                const f = cvRef.current?.files?.[0];
                if (!f) return toast("Choose a file first", "err");
                const fd = new FormData(); fd.append("cv", f);
                try { await api("/me/cv", { method: "POST", form: fd }); toast("CV uploaded"); load(); }
                catch (ex) { toast(ex instanceof Error ? ex.message : "Upload failed", "err"); }
              }}>Save CV to profile</button>
            </div>
            <div className="card" style={{ padding: 24, marginTop: 14 }}>
              <h4>Your data</h4>
              <p className="small muted">UK GDPR self-service — no support ticket needed.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="btn btn-ghost btn-sm" href="/api/me/export">Export my data (JSON)</a>
                <button className="btn btn-danger btn-sm" onClick={async () => {
                  if (!confirm("Delete your account and personal data? This cannot be undone.")) return;
                  await api("/me", { method: "DELETE" });
                  window.location.href = "/";
                }}>Delete my account</button></div>
            </div>
            <p style={{ marginTop: 20 }}>
              <button className="btn btn-ghost btn-sm" onClick={async () => { await api("/auth/logout", { method: "POST" }); await refreshSession(); window.location.href = "/"; }}>Sign out</button>
            </p>
          </section>
        )}
      </div>
    </>
  );
}
