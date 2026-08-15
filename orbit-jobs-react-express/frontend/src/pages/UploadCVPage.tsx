import { usePageMeta } from "@/lib/hooks";
import { UploadCVForm } from "@/components/views/UploadCVForm";
import { PairedCTA } from "@/components/PairedCTA";

export function UploadCVPage() {
  usePageMeta("Upload Your CV | Orbit Jobs", "Join the Orbit Jobs talent pool — we match your CV against new UK roles.");
  return (
    <>
      <div className="hero"><div className="container split-2" style={{ paddingTop: 52, paddingBottom: 44 }}>
        <div>
          <span className="eyebrow">Talent pool</span>
          <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)" }}>Upload <span className="hl-teal">your CV</span></h1>
          <p className="hero-sub">Nothing matching today? Leave your CV and we&rsquo;ll match you against new roles as they land. Kept 12 months, deleted on request, never sold.</p>
        </div>
        <img className="photo-panel m-hide" src="/media/img-network.webp" alt="Hiring teams talking in an office overlooking the city at sunset" loading="lazy" />
      </div></div>
      <div className="container" style={{ marginTop: 24 }}>
        <div className="split-2" style={{ alignItems: "start" }}>
          <UploadCVForm />
          <img className="photo-panel" src="/media/img-handshake.webp" alt="A recruiter and candidate shaking hands across an interview table" loading="lazy" style={{ position: "sticky", top: 110 }} />
        </div>
      </div>
      <PairedCTA market="UK" />
    </>
  );
}
