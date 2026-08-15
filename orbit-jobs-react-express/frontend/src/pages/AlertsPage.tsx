import { usePageMeta } from "@/lib/hooks";
import { AlertsView } from "@/components/views/AlertsView";

export function AlertsPage() {
  usePageMeta("Job Alerts | Orbit Jobs", "Manage your job alerts.");
  return (
    <div className="container" style={{ paddingTop: 48, maxWidth: 900 }}>
      <span className="eyebrow">Alerts</span>
      <h1 style={{ fontSize: "clamp(30px,4vw,44px)" }}>Job alerts</h1>
      <p className="muted small">Only genuinely new, deduplicated roles. Unsubscribe any time.</p>
      <AlertsView />
    </div>
  );
}
