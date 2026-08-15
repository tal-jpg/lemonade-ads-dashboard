/**
 * Client app shell: session + saves state, toasts, and the shared modals
 * (sign-in gate, quick CV drop-off, alert-from-filters). Ported from ui.js.
 *
 * Public pages stay statically cacheable because auth state hydrates on the
 * client after load — exactly how the original site behaved.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiError } from "@/lib/client";
import { NAV_SPECIALISMS } from "@/lib/taxonomy";
import type { Market, PublicJob, PublicUser } from "@/lib/types";
import { IconCheck, IconX } from "@/lib/icons";
import { CVFileInput } from "./CVFileInput";

/* ---------------- toasts ---------------- */
interface Toast { id: number; msg: string; kind?: "err" }
const ToastCtx = createContext<(msg: string, kind?: "err") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

/* ---------------- session ---------------- */
interface UserState {
  user: PublicUser | null;
  ready: boolean;
  saves: Set<string>;
  refreshSession: () => Promise<PublicUser | null>;
  toggleSave: (jobId: string) => Promise<void>;
  signInGate: (message?: string) => Promise<boolean>;
  openQuickCV: () => void;
  openAlertModal: (filters: Record<string, string>, label: string, market: Market) => void;
}
const UserCtx = createContext<UserState>({
  user: null, ready: false, saves: new Set(),
  refreshSession: async () => null, toggleSave: async () => {},
  signInGate: async () => false, openQuickCV: () => {}, openAlertModal: () => {},
});
export const useUser = () => useContext(UserCtx);

export const roleHome = (u: PublicUser) =>
  u.role === "employer" ? "/employers/dashboard" : u.role === "admin" ? "/admin" : "/account";

/* ---------------- generic modal ---------------- */
export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const f = [...el.querySelectorAll<HTMLElement>("a[href],button,input,select,textarea")].filter((x) => !(x as HTMLButtonElement).disabled);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    };
    document.addEventListener("keydown", keydown);
    el?.querySelector<HTMLElement>("input,select,textarea,button:not(.close-x)")?.focus();
    return () => document.removeEventListener("keydown", keydown);
  }, [onClose]);
  return (
    <div className="modal-scrim open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" role="dialog" aria-modal="true" ref={ref}>
        <button className="icon-btn close-x" aria-label="Close" onClick={onClose}><IconX /></button>
        {children}
      </div>
    </div>
  );
}

/* ---------------- provider ---------------- */
export function OrbitProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const [saves, setSaves] = useState<Set<string>>(new Set());
  const [gate, setGate] = useState<{ message?: string; resolve: (ok: boolean) => void } | null>(null);
  const [quickCV, setQuickCV] = useState(false);
  const [alertModal, setAlertModal] = useState<{ filters: Record<string, string>; label: string; market: Market } | null>(null);

  const toast = useCallback((msg: string, kind?: "err") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3900);
  }, []);

  const refreshSession = useCallback(async (): Promise<PublicUser | null> => {
    try {
      const { user: u } = await api<{ user: PublicUser | null }>("/auth/me");
      setUser(u);
      if (u && u.role === "candidate") {
        const { results } = await api<{ results: { job: PublicJob }[] }>("/me/saves");
        setSaves(new Set(results.map((r) => r.job.id)));
      } else setSaves(new Set());
      setReady(true);
      return u;
    } catch {
      setUser(null);
      setReady(true);
      return null;
    }
  }, []);

  useEffect(() => { refreshSession(); }, [refreshSession]);

  const signInGate = useCallback((message?: string) => {
    return new Promise<boolean>((resolve) => setGate({ message, resolve }));
  }, []);

  const toggleSave = useCallback(async (jobId: string) => {
    let u = user;
    if (!u || u.role !== "candidate") {
      const ok = await new Promise<boolean>((resolve) => setGate({ message: "Sign in and we'll save this job to your shortlist.", resolve }));
      if (!ok) return;
      u = await refreshSession();
      if (!u || u.role !== "candidate") return;
    }
    const saved = saves.has(jobId);
    try {
      if (saved) {
        await api(`/me/saves/${jobId}`, { method: "DELETE" });
        setSaves((s) => { const n = new Set(s); n.delete(jobId); return n; });
      } else {
        await api(`/me/saves/${jobId}`, { method: "POST" });
        setSaves((s) => new Set(s).add(jobId));
        toast("Saved to your shortlist");
      }
    } catch (ex) {
      toast(ex instanceof Error ? ex.message : "Something went wrong", "err");
    }
  }, [user, saves, toast, refreshSession]);

  const state: UserState = {
    user, ready, saves, refreshSession, toggleSave, signInGate,
    openQuickCV: () => setQuickCV(true),
    openAlertModal: (filters, label, market) => setAlertModal({ filters, label, market }),
  };

  return (
    <ToastCtx.Provider value={toast}>
      <UserCtx.Provider value={state}>
        {children}
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={"toast" + (t.kind === "err" ? " err" : "")} role="status">
              {t.kind !== "err" && <span style={{ color: "#58C2AE" }}><IconCheck /></span>}
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
        {gate && (
          <SignInGateModal
            message={gate.message}
            onDone={async (ok) => { gate.resolve(ok); setGate(null); if (ok) await refreshSession(); }}
          />
        )}
        {quickCV && <QuickCVModal onClose={() => setQuickCV(false)} toast={toast} />}
        {alertModal && (
          <AlertModal {...alertModal} user={user} toast={toast} onClose={() => setAlertModal(null)} />
        )}
      </UserCtx.Provider>
    </ToastCtx.Provider>
  );
}

/* ---------------- sign-in gate (in-context, resolves true on success) ---------------- */
function SignInGateModal({ message, onDone }: { message?: string; onDone: (ok: boolean) => void }) {
  const [email, setEmail] = useState("amelia@demo.orbitjobs.example");
  const [pass, setPass] = useState("demo1234");
  const [err, setErr] = useState("");
  return (
    <Modal onClose={() => onDone(false)}>
      <h3 style={{ marginBottom: 6 }}>Sign in to continue</h3>
      <p className="small muted">{message || "Saved jobs, application tracking and alerts live in your free account."}</p>
      <form noValidate onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        try {
          await api("/auth/login", { method: "POST", body: { email, password: pass } });
          onDone(true);
        } catch (ex) { setErr(ex instanceof Error ? ex.message : "Sign-in failed"); }
      }}>
        <div className="field"><label className="f-label" htmlFor="gf-email">Email</label>
          <input id="gf-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label className="f-label" htmlFor="gf-pass">Password</label>
          <input id="gf-pass" type="password" autoComplete="current-password" required value={pass} onChange={(e) => setPass(e.target.value)} />
          <p className="f-hint">Demo account is pre-filled — just press sign in.</p></div>
        {err && <div className="f-error">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%" }} type="submit">Sign in</button>
        <p className="small" style={{ textAlign: "center", margin: "14px 0 0" }}>New here? <a href="/account/register">Create an account</a></p>
      </form>
    </Modal>
  );
}

/* ---------------- Quick CV Drop-off ---------------- */
function QuickCVModal({ onClose, toast }: { onClose: () => void; toast: (m: string, k?: "err") => void }) {
  const [mode, setMode] = useState<"file" | "url">("file");
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: 4 }}>Quick CV drop-off</h3>
      <p className="small muted">No matching role right now? Leave your CV — we match the talent pool against new jobs.</p>
      <form id="qcv-form" noValidate onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        const f = e.currentTarget as HTMLFormElement;
        const fd = new FormData();
        fd.append("name", (f.elements.namedItem("qname") as HTMLInputElement).value);
        fd.append("email", (f.elements.namedItem("qemail") as HTMLInputElement).value);
        fd.append("specialism", (f.elements.namedItem("qspec") as HTMLSelectElement).value);
        fd.append("consent", (f.elements.namedItem("qconsent") as HTMLInputElement).checked ? "1" : "");
        fd.append("marketing", (f.elements.namedItem("qmkt") as HTMLInputElement).checked ? "1" : "");
        const file = fileRef.current?.files?.[0];
        if (file) fd.append("cv", file);
        fd.append("cvUrl", (f.elements.namedItem("qurl") as HTMLInputElement)?.value || "");
        try {
          const r = await api<{ message: string }>("/talent-pool", { method: "POST", form: fd });
          onClose();
          toast(r.message);
        } catch (ex) { setErr(ex instanceof Error ? ex.message : "Something went wrong"); }
      }}>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: -9999 }} aria-hidden="true" />
        <div className="form-grid">
          <div className="field"><label className="f-label" htmlFor="qcv-name">Full name</label><input id="qcv-name" name="qname" required placeholder="Type your full name" /></div>
          <div className="field"><label className="f-label" htmlFor="qcv-email">Email</label><input id="qcv-email" name="qemail" type="email" required placeholder="Type your email" /></div>
        </div>
        <div className="field"><label className="f-label" htmlFor="qcv-spec">Field</label>
          <select id="qcv-spec" name="qspec">{NAV_SPECIALISMS.map(([s, n]) => <option key={s} value={s}>{n}</option>)}</select></div>
        <div className="field"><label className="f-label">Upload file <span style={{ color: "var(--accent-500)" }}>*</span></label>
          <div style={{ display: "flex", gap: 14, marginBottom: 10 }} role="radiogroup">
            <label className="checkbox"><input type="radio" name="cvmode" value="file" checked={mode === "file"} onChange={() => setMode("file")} /> Upload a file</label>
            <label className="checkbox"><input type="radio" name="cvmode" value="url" checked={mode === "url"} onChange={() => setMode("url")} /> Link a profile</label>
          </div>
          <CVFileInput inputRef={fileRef} hidden={mode !== "file"} />
          <input type="url" name="qurl" placeholder="Paste your LinkedIn profile" hidden={mode !== "url"} />
          <p className="f-hint">PDF, DOC or DOCX, up to 5 MB.</p></div>
        <div className="field checkbox"><input type="checkbox" id="qcv-consent" name="qconsent" /><label htmlFor="qcv-consent">I agree to the <a href="/legal/privacy" target="_blank">privacy notice</a> — CVs are kept for 12 months. <span style={{ color: "var(--error)" }}>*</span></label></div>
        <div className="field checkbox"><input type="checkbox" id="qcv-mkt" name="qmkt" /><label htmlFor="qcv-mkt">Email me relevant roles and career tips (optional).</label></div>
        {err && <div className="f-error">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%" }} type="submit">Send my CV</button>
      </form>
    </Modal>
  );
}

/* ---------------- alert-from-filters modal ---------------- */
function AlertModal({ filters, label, market, user, toast, onClose }: {
  filters: Record<string, string>; label: string; market: Market;
  user: PublicUser | null; toast: (m: string, k?: "err") => void; onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [freq, setFreq] = useState("daily");
  const [err, setErr] = useState("");
  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: 4 }}>Create a job alert</h3>
      <p className="small muted">We&rsquo;ll email you new roles matching <strong>{label}</strong> — only genuinely new ones, deduplicated. Unsubscribe in one click.</p>
      <form noValidate onSubmit={async (e) => {
        e.preventDefault();
        setErr("");
        try {
          const r = await api<{ message: string }>("/alerts", { method: "POST", body: {
            email: user ? undefined : email,
            filters: { ...filters, country: market },
            name: label.slice(0, 70),
            frequency: freq,
          } });
          onClose();
          toast(r.message);
        } catch (ex) { setErr(ex instanceof Error ? ex.message : "Something went wrong"); }
      }}>
        {!user && (
          <div className="field"><label className="f-label" htmlFor="al-email">Email</label>
            <input id="al-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        )}
        <div className="field"><label className="f-label" htmlFor="al-freq">Frequency</label>
          <select id="al-freq" value={freq} onChange={(e) => setFreq(e.target.value)}>
            <option value="daily">Daily digest</option>
            <option value="instant">As they&rsquo;re posted</option>
            <option value="weekly">Weekly roundup</option>
          </select></div>
        {err && <div className="f-error">{err}</div>}
        <button className="btn btn-primary" style={{ width: "100%" }}>Create alert</button>
      </form>
    </Modal>
  );
}

/* Sign-in modal used by ApiError handling flows that need a status check. */
export { ApiError };
