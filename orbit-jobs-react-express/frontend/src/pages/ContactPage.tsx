import { usePageMeta } from "@/lib/hooks";
import { ContactForm } from "@/components/views/ContactForm";

export function ContactPage() {
  usePageMeta("Contact | Orbit Jobs", "Get in touch with the Orbit Jobs team.");
  return (
    <>
      <div className="hero"><div className="container" style={{ paddingTop: 52, paddingBottom: 36 }}>
        <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>Talk to us</h1>
        <p className="hero-sub">We reply within one working day. Accessibility reports jump the queue.</p>
      </div></div>
      <div className="container" style={{ marginTop: 24 }}>
        <div className="split-2" style={{ alignItems: "start" }}>
          <div>
            <ContactForm />
            <p className="small muted" style={{ marginTop: 16 }}>Prefer email? <strong>hello@orbitjobs.example</strong> · Employer support: <strong>employers@orbitjobs.example</strong></p>
          </div>
          <img className="photo-panel" src="/media/img-handshake.webp" alt="A recruiter and candidate shaking hands across an interview table" loading="lazy" style={{ position: "sticky", top: 110 }} />
        </div>
      </div>
    </>
  );
}
