/** Interactive islands on the job detail page: apply flows, share row, report modal, sticky bar. */
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client";
import type { PublicJobFull } from "@/lib/types";
import { Modal, useToast, useUser } from "@/components/providers";
import { CVFileInput } from "@/components/CVFileInput";

/* ---------------- share row + report ---------------- */
export function ShareRow({ j }: { j: PublicJobFull }) {
  const toast = useToast();
  const [href, setHref] = useState("");
  const [report, setReport] = useState(false);
  useEffect(() => setHref(window.location.href), []);
  return (
    <div className="share-row">
      <span className="small muted">Share:</span>
      <a className="icon-btn" target="_blank" rel="noopener" aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(href)}`}>in</a>
      <a className="icon-btn" target="_blank" rel="noopener" aria-label="Share on X" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(href)}`}>𝕏</a>
      <a className="icon-btn" aria-label="Share by email" href={`mailto:?subject=${encodeURIComponent(j.title + " at " + j.companyName)}&body=${encodeURIComponent(href)}`}>✉</a>
      <button className="btn btn-sm btn-ghost" onClick={async () => {
        try { await navigator.clipboard.writeText(window.location.href); toast("Link copied"); }
        catch { toast("Copy failed — use the address bar", "err"); }
      }}>Copy link</button>
      <button className="btn btn-sm btn-ghost" style={{ marginLeft: "auto", color: "var(--text-muted)", borderColor: "var(--border-strong)" }} onClick={() => setReport(true)}>Report listing</button>
      {report && <ReportModal j={j} onClose={() => setReport(false)} />}
    </div>
  );
}

function ReportModal({ j, onClose }: { j: PublicJobFull; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  return (
    <Modal onClose={onClose}>
      <h3>Report this listing</h3>
      <p className="small muted">Broken, misleading, discriminatory or asking for fees? Tell us — we review reports within one working day.</p>
      <form onSubmit={async (e) => {
        e.preventDefault();
        try {
          const r = await api<{ message: string }>(`/jobs/${j.id}/report`, { method: "POST", body: { reason, email } });
          onClose();
          toast(r.message);
        } catch (ex) { setErr(ex instanceof Error ? ex.message : "Something went wrong"); }
      }}>
        <input type="text" name="website" tabIndex={-1} style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
        <div className="field"><label className="f-label" htmlFor="rep-reason">What&rsquo;s wrong?</label>
          <textarea id="rep-reason" required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <div className="field"><label className="f-label" htmlFor="rep-email">Your email (optional)</label>
          <input id="rep-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {err && <div className="f-error">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%" }}>Send report</button>
      </form>
    </Modal>
  );
}

/* ---------------- sticky apply bar ---------------- */
export function StickyApply({ title, salaryLabel }: { title: string; salaryLabel: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const target = document.getElementById("apply-top");
    if (!target) return;
    const io = new IntersectionObserver(([en]) => setShow(!en.isIntersecting), { threshold: 0 });
    io.observe(target);
    return () => io.disconnect();
  }, []);
  return (
    <div className={"sticky-apply" + (show ? " show" : "")}>
      <div className="container">
        <div style={{ minWidth: 0 }}>
          <strong style={{ color: "var(--text-strong)" }}>{title}</strong>
          <span className="small muted"> · {salaryLabel}</span>
        </div>
        <a className="btn btn-primary" style={{ marginLeft: "auto" }} href="#apply">Apply now</a>
      </div>
    </div>
  );
}

/* ---------------- apply zone ---------------- */
export function ApplyZone({ j }: { j: PublicJobFull }) {
  const { user } = useUser();
  const toast = useToast();
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [cvMode, setCvMode] = useState<"file" | "url">("file");
  const [showDidApply, setShowDidApply] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (done) {
    return (
      <div className="card" id="apply">
        <div className="success-panel">
          <h3>✅ Application sent</h3>
          <p>{done}</p>
          {user
            ? <a className="btn btn-primary" href="/account">Track it in your dashboard</a>
            : <><p className="small muted">Create a free account to track this application&rsquo;s status.</p><a className="btn btn-primary" href="/account/register">Create account</a></>}
        </div>
      </div>
    );
  }

  /* partner listing → attributed link-out */
  if (j.class !== "direct") {
    return (
      <div className="card" id="apply">
        <h3>Apply for this role</h3>
        <p className="small">This job is listed <strong>via {j.source?.name}</strong>. You&rsquo;ll complete this application on their site — we&rsquo;ll keep the job saved here{user ? "" : " if you sign in"}.</p>
        <a className="btn btn-primary btn-lg" href={j.externalApplyUrl || "#"} target="_blank" rel="noopener"
          onClick={() => setTimeout(() => { if (user) setShowDidApply(true); }, 800)}>
          Apply on {j.source?.name} ↗
        </a>
        {showDidApply && (
          <div style={{ marginTop: 16 }}>
            <p className="small muted">Did you complete your application on {j.source?.name}?</p>
            <button className="btn btn-sm btn-ghost" onClick={async () => {
              try {
                const r = await api<{ message: string }>(`/jobs/${j.id}/log-external-apply`, { method: "POST" });
                toast(r.message);
                setShowDidApply(false);
              } catch (ex) { toast(ex instanceof Error ? ex.message : "Something went wrong", "err"); }
            }}>Yes — track it in my dashboard</button>
          </div>
        )}
      </div>
    );
  }

  async function submit(useProfile: boolean) {
    setErr("");
    const fd = new FormData();
    fd.append("useProfile", useProfile ? "1" : "");
    const form = formRef.current;
    const val = (id: string) => (form?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("#" + id)?.value ?? "");
    fd.append("consent", useProfile ? "1" : ((form?.querySelector<HTMLInputElement>("#ap-consent")?.checked) ? "1" : ""));
    if (!useProfile) {
      fd.append("firstName", val("ap-fn")); fd.append("lastName", val("ap-ln"));
      fd.append("email", val("ap-em")); fd.append("phone", val("ap-ph"));
      const f = fileRef.current?.files?.[0];
      if (f) fd.append("cv", f);
      fd.append("cvUrl", val("ap-cvurl"));
      fd.append("message", val("ap-msg"));
      fd.append("answers", JSON.stringify((j.screeningQuestions || []).map((q, i) => ({ q: q.q, a: val("ap-q" + i) }))));
    }
    try {
      const r = await api<{ message: string }>(`/jobs/${j.id}/apply`, { method: "POST", form: fd });
      setDone(r.message);
      document.getElementById("apply")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (ex) {
      setErr(ex instanceof ApiError || ex instanceof Error ? (ex as Error).message : "Something went wrong");
    }
  }

  const oneClick = user && user.role === "candidate";
  return (
    <div className="card" id="apply">
      <h3>Apply for this role</h3>
      {oneClick && (
        <div className="nudge" style={{ marginBottom: 16 }}>
          Signed in as <strong>{user.name}</strong> — apply with your saved profile in one click, or fill the form below.
          <div style={{ marginTop: 10 }}><button className="btn btn-primary" onClick={() => submit(true)}>Apply with my profile</button></div>
        </div>
      )}
      <form ref={formRef} noValidate onSubmit={(e) => { e.preventDefault(); submit(false); }}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
        <div className="form-grid">
          <div className="field"><label className="f-label" htmlFor="ap-fn">First name</label><input id="ap-fn" autoComplete="given-name" required placeholder="Type your first name" /></div>
          <div className="field"><label className="f-label" htmlFor="ap-ln">Last name</label><input id="ap-ln" autoComplete="family-name" required placeholder="Type your last name" /></div>
        </div>
        <div className="form-grid">
          <div className="field"><label className="f-label" htmlFor="ap-em">Email</label><input id="ap-em" type="email" autoComplete="email" required placeholder="Type your email" /></div>
          <div className="field"><label className="f-label" htmlFor="ap-ph">Phone</label><input id="ap-ph" type="tel" autoComplete="tel" placeholder="Type your phone" /></div>
        </div>
        <div className="field"><label className="f-label">Your CV</label>
          <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
            <label className="checkbox"><input type="radio" name="cvmode" value="file" checked={cvMode === "file"} onChange={() => setCvMode("file")} /> Upload a file</label>
            <label className="checkbox"><input type="radio" name="cvmode" value="url" checked={cvMode === "url"} onChange={() => setCvMode("url")} /> Link a profile</label>
          </div>
          <CVFileInput inputRef={fileRef} hidden={cvMode !== "file"} />
          <input type="url" id="ap-cvurl" placeholder="Paste your LinkedIn profile" hidden={cvMode !== "url"} />
          <p className="f-hint">PDF, DOC or DOCX up to 5 MB.</p></div>
        {(j.screeningQuestions || []).map((q, i) => (
          <div className="field" key={i}>
            <label className="f-label" htmlFor={"ap-q" + i}>{q.q}</label>
            {q.kind === "yesno"
              ? <select id={"ap-q" + i}><option>Yes</option><option>No</option></select>
              : <textarea id={"ap-q" + i} rows={3} />}
          </div>
        ))}
        <div className="field"><label className="f-label" htmlFor="ap-msg">Message (optional)</label><textarea id="ap-msg" rows={3} placeholder="Paste your message — notice period, availability…" /></div>
        <div className="field checkbox"><input type="checkbox" id="ap-consent" /><label htmlFor="ap-consent">I agree my details go to {j.companyName} and are handled per the <a href="/legal/privacy" target="_blank">privacy notice</a>. <span style={{ color: "var(--error)" }}>*</span></label></div>
        {err && <div className="f-error">{err}</div>}
        <button className="btn btn-primary btn-lg" type="submit" style={{ width: "100%" }}>Apply now</button>
        <p className="caption" style={{ textAlign: "center", marginTop: 10 }}>Takes under a minute. No account needed — though one lets you track it.</p>
      </form>
    </div>
  );
}

/* ---------------- expired page alert button ---------------- */
export function ExpiredAlertButton({ specialism, label, market }: { specialism: string; label: string; market: "UK" | "US" }) {
  const { openAlertModal } = useUser();
  return (
    <button className="btn btn-accent" onClick={() => openAlertModal({ specialism }, label, market)}>Alert me about roles like this</button>
  );
}

/* Spec/industry alert buttons reuse the same context. */
export function AlertButton({ filters, label, market, className, children }: {
  filters: Record<string, string>; label: string; market: "UK" | "US"; className?: string; children: React.ReactNode;
}) {
  const { openAlertModal } = useUser();
  return <button className={className || "btn btn-accent"} onClick={() => openAlertModal(filters, label, market)}>{children}</button>;
}
