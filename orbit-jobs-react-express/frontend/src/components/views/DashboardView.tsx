/** Employer dashboard: KPIs, listings table with actions, applicant pipeline, company profile. */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { dateShort, timeAgo } from "@/lib/format";
import type { Salary } from "@/lib/types";
import { Skeletons } from "@/components/JobCard";
import { useToast, useUser } from "@/components/providers";

interface DashJob {
  id: string; slug: string; title: string; status: string;
  city: string; jobType: string; salary: Salary;
  postedAt: string | null; validThrough: string | null;
  views: number; applies: number;
}
interface DashData {
  company: { name: string; slug: string; verifiedStatus: string };
  totals: { live: number; views: number; applies: number };
  results: DashJob[];
}
interface Applicant {
  id: string; name: string; email: string; phone: string;
  cvFile: string | null; cvUrl: string | null; message: string;
  screeningAnswers: { q: string; a: string }[];
  status: string; appliedAt: string;
}

const statusLabel: Record<string, string> = { draft: "Draft", in_review: "In review", live: "Live", paused: "Paused", expired: "Expired", closed: "Closed" };

export function DashboardView() {
  const { user, ready, signInGate } = useUser();
  const toast = useToast();
  const [data, setData] = useState<DashData | null>(null);
  const [applicants, setApplicants] = useState<{ job: { id: string; title: string }; results: Applicant[] } | null>(null);
  const [company, setCompany] = useState<{ about: string; website: string; city: string } | null>(null);

  const load = useCallback(async () => {
    const d = await api<DashData>("/employer/jobs");
    setData(d);
    const { company: c } = await api<{ company: { about?: string; website?: string; city?: string } }>("/employer/company");
    setCompany({ about: c.about || "", website: c.website || "", city: c.city || "" });
  }, []);

  useEffect(() => {
    if (ready && user?.role === "employer") load();
  }, [ready, user, load]);

  if (!ready) return <div className="container" style={{ paddingTop: 64 }}><Skeletons n={2} /></div>;

  if (!user || user.role !== "employer") {
    return (
      <div className="container" style={{ maxWidth: 640, paddingTop: 64 }}>
        <div className="empty card"><div className="ring-illo" /><h2>Employer dashboard</h2>
          <p className="muted">Sign in with an employer account to manage listings and applicants.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={async () => { if (await signInGate("Sign in with your employer account.")) window.location.reload(); }}>Sign in</button>
            <a className="btn btn-ghost" href="/account/register?as=employer">Create employer account</a></div>
          <p className="caption" style={{ marginTop: 12 }}>Demo employer: priya@thameslogistics.example / demo1234</p></div>
      </div>
    );
  }
  if (!data) return <div className="container" style={{ paddingTop: 64 }}><Skeletons n={3} /></div>;

  async function action(jobId: string, act: string) {
    if (act === "close" && !confirm("Close this listing? Candidates will see it as closed.")) return;
    try {
      await api(`/employer/jobs/${jobId}/${act}`, { method: "POST" });
      toast("Done");
      load();
    } catch (ex) { toast(ex instanceof Error ? ex.message : "Something went wrong", "err"); }
  }

  async function showApplicants(jobId: string) {
    setApplicants(null);
    const d = await api<{ job: { id: string; title: string }; results: Applicant[] }>(`/employer/jobs/${jobId}/applicants`);
    setApplicants(d);
    setTimeout(() => document.getElementById("applicants-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  return (
    <>
      <div className="hero job-hero"><div className="container split-2" style={{ alignItems: "center" }}>
        <div>
          <div className="head-row" style={{ marginBottom: 24, alignItems: "center" }}>
            <div>
              <span className="eyebrow" style={{ marginTop: 26 }}>Employer dashboard</span>
              <h1 className="job-title" style={{ fontSize: "clamp(30px,3.8vw,46px)", marginBottom: 8 }}>{data.company.name}</h1>
              <p className="muted small" style={{ margin: 0 }}>Listings, applicants and your public profile{data.company.verifiedStatus !== "verified" && <> · <span className="chip warn">verification pending</span></>}</p>
            </div>
            <a className="btn btn-accent" href="/employers/post-a-job">Post a new job</a></div>
          <div className="kpis" style={{ margin: 0 }}>
            <div className="kpi"><div className="n">{data.totals.live}</div><div className="c">Live listings</div></div>
            <div className="kpi"><div className="n">{data.totals.views.toLocaleString()}</div><div className="c">Total views</div></div>
            <div className="kpi"><div className="n">{data.totals.applies}</div><div className="c">Applications</div></div>
          </div>
        </div>
        <img className="photo-panel m-hide" src="/media/img-team.webp" alt="A hiring manager presenting a hire, develop, grow together plan to their team" loading="lazy" />
      </div></div>
      <div className="container" style={{ paddingTop: 40 }}>
        <div className="head-row" style={{ marginBottom: 16 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Listings</span><h2 style={{ fontSize: 26, margin: 0 }}>Your roles</h2></div></div>
        <div className="table-scroll"><table className="data">
          <thead><tr><th>Role</th><th>Status</th><th>Views</th><th>Applies</th><th>Expires</th><th>Actions</th></tr></thead>
          <tbody>
            {data.results.map((j) => (
              <tr key={j.id}>
                <td><strong style={{ color: "var(--text-strong)" }}>{j.title}</strong><br /><span className="caption">{j.city} · {j.jobType}{j.salary?.currency === "USD" ? " · US" : ""}</span></td>
                <td><span className={`pill ${j.status}`}>{statusLabel[j.status] || j.status}</span></td>
                <td>{j.views}</td>
                <td>{j.applies ? <button className="btn btn-sm btn-ghost" onClick={() => showApplicants(j.id)}>{j.applies} — view</button> : "0"}</td>
                <td className="caption">{dateShort(j.validThrough)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {j.status === "live" && <><a className="btn btn-sm btn-ghost" href={`/jobs/${j.slug}`} target="_blank">View</a>{" "}
                    <button className="btn btn-sm btn-ghost" onClick={() => action(j.id, "pause")}>Pause</button></>}
                  {j.status === "paused" && <button className="btn btn-sm btn-ghost" onClick={() => action(j.id, "resume")}>Resume</button>}
                  {["expired", "closed"].includes(j.status) && <button className="btn btn-sm btn-ghost" onClick={() => action(j.id, "repost")}>Repost</button>}
                  {["draft", "in_review"].includes(j.status) && <a className="btn btn-sm btn-ghost" href={`/employers/post-a-job?id=${j.id}`}>Edit</a>}
                  {" "}{j.status !== "closed" && <button className="btn btn-sm btn-danger" onClick={() => action(j.id, "close")}>Close</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>

        <section id="applicants-panel" style={{ marginTop: 40 }}>
          {applicants && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ fontSize: 24, margin: 0 }}>Applicants — {applicants.job.title} ({applicants.results.length})</h2>
                <a className="btn btn-sm btn-ghost" href={`/api/employer/jobs/${applicants.job.id}/applicants.csv`}>Export CSV</a></div>
              <p className="caption">Status changes email the candidate a kind, generic update and appear in their tracker.</p>
              {applicants.results.length === 0 && <p className="muted">No applicants yet — listings average their first application within days.</p>}
              {applicants.results.map((a) => (
                <div key={a.id} className="applicant-row">
                  <div className="top">
                    <div>
                      <strong style={{ color: "var(--text-strong)" }}>{a.name}</strong>
                      <span className="small muted"> · {a.email}{a.phone ? " · " + a.phone : ""}</span><br />
                      <span className="caption">Applied {timeAgo(a.appliedAt)} · {a.cvFile ? <a href={a.cvFile}>Download CV</a> : a.cvUrl ? <a href={a.cvUrl} rel="noopener" target="_blank">Profile link ↗</a> : "no CV"}</span>
                    </div>
                    <select defaultValue={a.status} style={{ width: 160, height: 42 }} onChange={async (e) => {
                      try {
                        await api("/employer/applications/" + a.id, { method: "PATCH", body: { status: e.target.value } });
                        toast("Status updated — candidate notified");
                      } catch (ex) { toast(ex instanceof Error ? ex.message : "Update failed", "err"); }
                    }}>
                      {["submitted", "viewed", "shortlisted", "contacted", "rejected"].map((s) => (
                        <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  {a.message && <p className="small" style={{ margin: "10px 0 0" }}>&ldquo;{a.message}&rdquo;</p>}
                  {a.screeningAnswers?.length > 0 && (
                    <div className="small muted" style={{ marginTop: 8 }}>
                      {a.screeningAnswers.map((s, i) => <div key={i}><strong>{s.q}</strong> — {s.a}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </section>

        {company && (
          <section style={{ marginTop: 48, maxWidth: 680 }}>
            <div className="head-row" style={{ marginBottom: 10 }}><div><span className="eyebrow" style={{ marginBottom: 10 }}>Profile</span><h2 style={{ fontSize: 26, margin: 0 }}>Company profile</h2></div></div>
            <p className="small muted">Shown on your public page and every listing.</p>
            <form className="card" style={{ padding: 28 }} onSubmit={async (e) => {
              e.preventDefault();
              await api("/employer/company", { method: "PATCH", body: company });
              toast("Profile saved");
            }}>
              <div className="field"><label className="f-label" htmlFor="cf-about">About the company</label>
                <textarea id="cf-about" rows={4} placeholder="Paste a short intro — what you build, how you work" value={company.about} onChange={(e) => setCompany({ ...company, about: e.target.value })} /></div>
              <div className="form-grid">
                <div className="field"><label className="f-label" htmlFor="cf-website">Website</label>
                  <input id="cf-website" type="url" placeholder="https://" value={company.website} onChange={(e) => setCompany({ ...company, website: e.target.value })} /></div>
                <div className="field"><label className="f-label" htmlFor="cf-city">HQ city</label>
                  <input id="cf-city" placeholder="Type your HQ city" value={company.city} onChange={(e) => setCompany({ ...company, city: e.target.value })} /></div></div>
              <button className="btn btn-primary btn-sm">Save profile</button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}
