import { usePageMeta } from "@/lib/hooks";
import { SavedView } from "@/components/views/SavedView";

export function SavedPage() {
  usePageMeta("Saved Jobs | Orbit Jobs", "Your saved jobs shortlist.");
  return (
    <div className="container" style={{ paddingTop: 48, maxWidth: 900 }}>
      <span className="eyebrow">Shortlist</span>
      <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>Saved jobs</h1>
      <SavedView />
    </div>
  );
}
