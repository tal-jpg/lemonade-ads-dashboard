/** Admin operations: moderation queue, reports, classifier fixes, sources, audit + email logs. */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { salaryText, timeAgo } from "@/lib/format";
import { NAV_SPECIALISMS } from "@/lib/taxonomy";
import type { Salary, Source } from "@/lib/types";
import { Skeletons } from "@/components/JobCard";
import { useToast, useUser } from "@/components/providers";

interface Overview {
  queues: { jobsInReview: number; flaggedEmployers: number; openReports: number; lowConfidence: number };
  totals: { liveJobs: number; direct: number; aggregated: number; employers: number; candidates: number; applications: number; talentPool: number };
}
interface Queue {
  jobs: { id: string; title: string; companyName: string; city: string; salary: Salary; employerStatus?: string }[];
  reports: { id: string; jobTitle: string; companyName: string; reason: string }[];
  lowConfidence: { id: string; title: string; specialism: string; source?: string }[];
}
interface LogRow { at: string; actor?: string; action?: string; target?: string; reason?: string; template?: string; to?: string; status?: string }

export function AdminView() {
  const { user, ready, signInGate } = useUser();
  const toast = useToast();
  const [ov, setOv] = useState<Overview | null>(null);
  const [queue, setQueue] = useState<Queue | null>(null);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [auditLog, setAuditLog] = useState<LogRow[] | null>(null);
  const [emails, setEmails] = useState<LogRow[] | null>(null);
  const [reclass, setReclass] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const [o, q, s] = await Promise.all([
      api<Overview>("/admin/overview"),
      api<Queue>("/admin/queue"),
      api<{ results: Source[] }>("/admin/sources"),
    ]);
    setOv(o); setQueue(q); setSources(s.results);
    api<{ results: LogRow[] }>("/admin/audit").then(({ results }) => setAuditLog(results));
    api<{ results: LogRow[] }>("/admin/emails").then(({ results }) => setEmails(results));
  }, []);

  useEffect(() => {
    if (ready && user?.role === "admin") load();
  }, [ready, user, load]);

  if (!ready) return <div className="container" style={{ paddingTop: 64 }}><Skeletons n={2} /></div>;

  if (!user || user.role !== "admin") {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 64 }}>
        <div className="empty card">
          <div className="ring-illo" /><h2>Internal operations</h2><p className="muted">Admin sign-in required.</p>
          <button className="btn btn-primary" onClick={async () => { if (await signInGate("Sign in with the admin account.")) window.location.reload(); }}>Sign in</button>
          <p className="caption" style={{ marginTop: 12 }}>Demo admin: admin@orbitjobs.example / admin1234</p></div>
      </div>
    );
  }
  if (!ov || !queue || !sources) return <div className="container" style={{ paddingTop: 64 }}><Skeletons n={3} /></div>;

  return (
    <>
      <div className="hero job-hero"><div className="container">
        <span className="eyebrow" style={{ marginTop: 26 }}>Admin</span>
        <h1 className="job-title" style={{ fontSize: "clamp(30px,3.8vw,46px)", marginBottom: 8 }}>Operations</h1>
        <p className="muted small" style={{ margin: "0 0 24px" }}>Moderation SLA: one working day. Every action here is audit-logged.</p>
        <div className="kpis" style={{ margin: 0 }}>
          <div className="kpi"><div className="n">{ov.totals.liveJobs}</div><div className="c">Live jobs ({ov.totals.direct} direct / {ov.totals.aggregated} partner)</div></div>
          <div className="kpi"><div className="n">{ov.queues.jobsInReview}</div><div className="c">Jobs in review</div></div>
          <div className="kpi"><div className="n">{ov.queues.openReports}</div><div className="c">Open reports</div></div>
          <div className="kpi"><div className="n">{ov.queues.lowConfidence}</div><div className="c">Low-confidence classifications</div></div>
          <div className="kpi"><div className="n">{ov.totals.applications}</div><div className="c">Applications</div></div>
          <div className="kpi"><div className="n">{ov.totals.talentPool}</div><div className="c">Talent pool CVs</div></div>
        </div>
      </div></div>
      <div className="container" style={{ paddingTop: 40 }}>
        <section>
          <div className="head-row" style={{ marginBottom: 14 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Moderation</span><h2 style={{ fontSize: 26, margin: 0 }}>First postings queue</h2></div></div>
          {queue.jobs.length ? queue.jobs.map((j) => (
            <div key={j.id} className="applicant-row">
              <div className="top">
                <div>
                  <strong style={{ color: "var(--text-strong)" }}>{j.title}</strong>
                  <span className="small muted"> · {j.companyName} · {j.city} · {j.salary.disclosed ? salaryText(j.salary) : "salary undisclosed"}</span><br />
                  <span className="caption">Employer status: {j.employerStatus || "?"}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={async () => {
                    await api(`/admin/jobs/${j.id}/approve`, { method: "POST", body: {} });
                    toast("Approved — employer notified");
                    load();
                  }}>Approve</button>
                  <button className="btn btn-sm btn-danger" onClick={async () => {
                    const reason = prompt("Reason (sent to the employer):") || "";
                    await api(`/admin/jobs/${j.id}/reject`, { method: "POST", body: { reason } });
                    toast("Rejected — employer notified");
                    load();
                  }}>Reject</button>
                </div>
              </div>
            </div>
          )) : <p className="muted">Queue clear 🎉</p>}
        </section>

        <section style={{ marginTop: 44 }}>
          <div className="head-row" style={{ marginBottom: 14 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Reports</span><h2 style={{ fontSize: 26, margin: 0 }}>Reported listings</h2></div></div>
          {queue.reports.length ? queue.reports.map((r) => (
            <div key={r.id} className="applicant-row">
              <div className="top">
                <div><strong style={{ color: "var(--text-strong)" }}>{r.jobTitle}</strong> <span className="small muted">· {r.companyName}</span><br />
                  <span className="small">&ldquo;{r.reason}&rdquo;</span></div>
                <button className="btn btn-sm btn-ghost" onClick={async () => {
                  await api(`/admin/reports/${r.id}/resolve`, { method: "POST", body: {} });
                  toast("Resolved");
                  load();
                }}>Mark resolved</button>
              </div>
            </div>
          )) : <p className="muted">No open reports.</p>}
        </section>

        <section style={{ marginTop: 44 }}>
          <div className="head-row" style={{ marginBottom: 14 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Classifier</span><h2 style={{ fontSize: 26, margin: 0 }}>Low-confidence classifications</h2></div></div>
          {queue.lowConfidence.length ? queue.lowConfidence.map((j) => (
            <div key={j.id} className="applicant-row">
              <div className="top">
                <div><strong style={{ color: "var(--text-strong)" }}>{j.title}</strong> <span className="small muted">via {j.source || "?"} · currently: {j.specialism}</span></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ width: 220, height: 40 }} value={reclass[j.id] || j.specialism} onChange={(e) => setReclass({ ...reclass, [j.id]: e.target.value })}>
                    {NAV_SPECIALISMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <button className="btn btn-sm btn-primary" onClick={async () => {
                    await api(`/admin/jobs/${j.id}/reclassify`, { method: "POST", body: { specialism: reclass[j.id] || j.specialism } });
                    toast("Reclassified");
                    load();
                  }}>Set</button>
                </div>
              </div>
            </div>
          )) : <p className="muted">Classifier is confident about everything currently live.</p>}
        </section>

        <section style={{ marginTop: 44 }}>
          <div className="head-row" style={{ marginBottom: 14 }}>
            <div><span className="eyebrow" style={{ marginBottom: 10 }}>Pipeline</span><h2 style={{ fontSize: 26, margin: 0 }}>Aggregation sources</h2></div>
            <button className="btn btn-sm btn-accent" onClick={async (e) => {
              const btn = e.currentTarget;
              btn.textContent = "Syncing…";
              await api("/admin/sources/sync", { method: "POST", body: {} });
              toast("Pipeline run complete");
              load();
            }}>Run sync now</button></div>
          <div className="table-scroll"><table className="data">
            <thead><tr><th>Source</th><th>Type</th><th>Schedule</th><th>Last run</th><th>In / kept / merged</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id}>
                  <td><strong style={{ color: "var(--text-strong)" }}>{s.name}</strong><br /><span className="caption">{s.permission_evidence}</span></td>
                  <td>{s.adapter_type}</td><td>{s.schedule}</td>
                  <td className="caption">{s.health ? timeAgo(s.health.lastRun) : "—"}</td>
                  <td>{s.health ? `${s.health.itemsIn} / ${s.health.itemsKept} / ${s.health.merged}` : "—"}</td>
                  <td><span className={"pill " + (s.active ? "live" : "closed")}>{s.active ? "active" : "off"}</span></td>
                  <td><button className={"btn btn-sm " + (s.active ? "btn-danger" : "btn-ghost")} onClick={async () => {
                    await api(`/admin/sources/${s.id}/toggle`, { method: "POST", body: {} });
                    toast("Source updated");
                    load();
                  }}>{s.active ? "Kill switch" : "Enable"}</button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </section>

        <section style={{ marginTop: 44 }}>
          <div className="head-row" style={{ marginBottom: 14 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Trail</span><h2 style={{ fontSize: 26, margin: 0 }}>Audit log</h2></div></div>
          <div className="small muted">
            {!auditLog ? "Loading…" : (
              <div className="table-scroll"><table className="data"><tbody>
                {auditLog.slice(0, 12).map((a, i) => (
                  <tr key={i}><td className="caption">{timeAgo(a.at)}</td><td>{a.actor}</td><td><strong>{a.action}</strong></td><td className="caption">{a.target} {a.reason || ""}</td></tr>
                ))}
              </tbody></table></div>
            )}
          </div>
        </section>
        <section style={{ marginTop: 44, marginBottom: 24 }}>
          <div className="head-row" style={{ marginBottom: 14 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Outbox</span><h2 style={{ fontSize: 26, margin: 0 }}>Email log (demo sends)</h2></div></div>
          <div className="small muted">
            {!emails ? "Loading…" : emails.length ? (
              <div className="table-scroll"><table className="data"><tbody>
                {emails.slice(0, 12).map((e, i) => (
                  <tr key={i}><td className="caption">{timeAgo(e.at)}</td><td><strong>{e.template}</strong></td><td>{e.to}</td><td className="caption">{e.status}</td></tr>
                ))}
              </tbody></table></div>
            ) : "No emails yet."}
          </div>
        </section>
      </div>
    </>
  );
}
