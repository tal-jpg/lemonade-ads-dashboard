import { useState } from "react";
import { api } from "@/lib/client";

export function ContactForm() {
  const [f, setF] = useState({ reason: "candidate", name: "", email: "", message: "" });
  const [err, setErr] = useState("");
  const [done, setDone] = useState("");

  if (done) {
    return (
      <div className="card form-card" style={{ padding: 36 }}>
        <div className="success-panel"><h3>✅ Message sent</h3><p>{done}</p></div>
      </div>
    );
  }
  return (
    <div className="card form-card" style={{ padding: 36 }}>
      <h3>Get in touch</h3>
      <form noValidate onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        try {
          const r = await api<{ message: string }>("/contact", { method: "POST", body: f });
          setDone(r.message);
        } catch (ex) { setErr(ex instanceof Error ? ex.message : "Something went wrong"); }
      }}>
        <input type="text" name="website" tabIndex={-1} style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
        <div className="field"><label className="f-label" htmlFor="ct-reason">What&rsquo;s this about?</label>
          <select id="ct-reason" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>
            <option value="candidate">I&rsquo;m a job seeker and need help</option>
            <option value="employer">I&rsquo;m an employer and need help</option>
            <option value="data">Data or privacy request</option>
            <option value="partnership">Partnerships / add my job board</option>
            <option value="press">Press</option>
            <option value="accessibility">Accessibility problem</option>
          </select></div>
        <div className="form-grid">
          <div className="field"><label className="f-label" htmlFor="ct-name">Your name</label>
            <input id="ct-name" required placeholder="Type your full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="field"><label className="f-label" htmlFor="ct-email">Email</label>
            <input id="ct-email" type="email" required placeholder="Type your email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
        </div>
        <div className="field"><label className="f-label" htmlFor="ct-msg">Message</label>
          <textarea id="ct-msg" rows={5} required placeholder="Paste your message" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
        {err && <div className="f-error">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%" }}>Send message</button>
      </form>
    </div>
  );
}
