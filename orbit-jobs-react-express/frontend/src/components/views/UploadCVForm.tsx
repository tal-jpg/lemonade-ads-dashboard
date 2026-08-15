import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { NAV_SPECIALISMS } from "@/lib/taxonomy";
import { CVFileInput } from "@/components/CVFileInput";

export function UploadCVForm() {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [more, setMore] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ name: "", email: "", specialism: "technology", currentTitle: "", cvUrl: "", consent: false, marketing: false });

  if (done) {
    return (
      <div className="card form-card" style={{ padding: 36 }}>
        <div className="success-panel"><h3>✅ CV received</h3><p>{done}</p>
          <a className="btn btn-primary" href="/jobs">Browse live jobs</a></div>
      </div>
    );
  }
  return (
    <div className="card form-card" style={{ padding: 36 }}>
      <h3>Upload your CV</h3>
      <form noValidate onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        const fd = new FormData();
        fd.append("name", f.name); fd.append("email", f.email);
        fd.append("specialism", f.specialism); fd.append("currentTitle", f.currentTitle);
        fd.append("consent", f.consent ? "1" : ""); fd.append("marketing", f.marketing ? "1" : "");
        const file = fileRef.current?.files?.[0];
        if (file) fd.append("cv", file);
        fd.append("cvUrl", f.cvUrl || "");
        try {
          const r = await api<{ message: string }>("/talent-pool", { method: "POST", form: fd });
          setDone(r.message);
        } catch (ex) { setErr(ex instanceof Error ? ex.message : "Something went wrong"); }
      }}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
        <div className="form-grid">
          <div className="field"><label className="f-label" htmlFor="ucv-name">Full name</label>
            <input id="ucv-name" required autoComplete="name" placeholder="Type your full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="field"><label className="f-label" htmlFor="ucv-email">Email</label>
            <input id="ucv-email" type="email" required autoComplete="email" placeholder="Type your email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
        <div className="field"><label className="f-label" htmlFor="ucv-specialism">Your field</label>
          <select id="ucv-specialism" value={f.specialism} onChange={(e) => setF({ ...f, specialism: e.target.value })}>
            {NAV_SPECIALISMS.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
          </select></div>
        <div className="field"><label className="f-label">Upload file <span style={{ color: "var(--accent-500)" }}>*</span></label>
          <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
            <label className="checkbox"><input type="radio" name="cvmode" value="file" checked={mode === "file"} onChange={() => setMode("file")} /> Upload a file</label>
            <label className="checkbox"><input type="radio" name="cvmode" value="url" checked={mode === "url"} onChange={() => setMode("url")} /> Link a profile</label></div>
          <CVFileInput inputRef={fileRef} hidden={mode !== "file"} />
          <input type="url" placeholder="Paste your LinkedIn profile" hidden={mode !== "url"} value={f.cvUrl} onChange={(e) => setF({ ...f, cvUrl: e.target.value })} />
          <p className="f-hint">PDF, DOC or DOCX up to 5 MB — or a LinkedIn/portfolio link if you&rsquo;re on your phone.</p></div>
        {!more && <button type="button" className="btn btn-sm btn-ghost" onClick={() => setMore(true)}>+ Add more detail (optional)</button>}
        {more && (
          <div style={{ marginTop: 14 }}>
            <div className="field"><label className="f-label" htmlFor="ucv-currentTitle">Current job title</label>
              <input id="ucv-currentTitle" value={f.currentTitle} onChange={(e) => setF({ ...f, currentTitle: e.target.value })} /></div>
          </div>
        )}
        <div className="field checkbox" style={{ marginTop: 14 }}><input type="checkbox" id="ucv-consent" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} /><label htmlFor="ucv-consent">I agree to the <a href="/legal/privacy" target="_blank">privacy notice</a> — my CV is kept for 12 months with a renewal reminder. <span style={{ color: "var(--error)" }}>*</span></label></div>
        <div className="field checkbox"><input type="checkbox" id="ucv-mkt" checked={f.marketing} onChange={(e) => setF({ ...f, marketing: e.target.checked })} /><label htmlFor="ucv-mkt">Email me matching roles and career tips (optional, unsubscribe any time).</label></div>
        {err && <div className="f-error">{err}</div>}
        <button className="btn btn-primary btn-lg" style={{ width: "100%" }}>Send my CV</button>
      </form>
    </div>
  );
}
