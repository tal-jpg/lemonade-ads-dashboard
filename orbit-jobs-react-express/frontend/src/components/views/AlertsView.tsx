import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { SPEC_NAMES } from "@/lib/taxonomy";
import type { Alert, PublicJob } from "@/lib/types";
import { JobCard, Skeletons } from "@/components/JobCard";
import { useToast, useUser } from "@/components/providers";

function describeFilters(f: Record<string, string>): string {
  const bits: string[] = [];
  if (f.q) bits.push(`“${f.q}”`);
  if (f.specialism) bits.push(String(f.specialism).split(",").map((s) => SPEC_NAMES[s] || s).join(", "));
  if (f.loc) bits.push(f.loc);
  if (f.workModel) bits.push(f.workModel);
  return bits.join(" · ") || "All new UK jobs";
}

export function AlertsView() {
  const { user, ready, signInGate } = useUser();
  const toast = useToast();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [previews, setPreviews] = useState<Record<string, PublicJob[] | "loading">>({});

  const load = useCallback(() => {
    api<{ results: Alert[] }>("/me/alerts").then(({ results }) => setAlerts(results));
  }, []);

  useEffect(() => {
    if (ready && user?.role === "candidate") load();
  }, [ready, user, load]);

  if (!ready) return <Skeletons n={2} />;
  if (!user || user.role !== "candidate") {
    return (
      <div className="empty card"><div className="ring-illo" /><h3>Manage alerts in your account</h3>
        <p className="muted">Sign in to view, pause or delete your job alerts.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={async () => { if (await signInGate()) window.location.reload(); }}>Sign in</button>
          <a className="btn btn-ghost" href="/account/register">Create account</a></div></div>
    );
  }
  if (!alerts) return <Skeletons n={2} />;
  if (!alerts.length) {
    return (
      <div className="empty card"><div className="ring-illo" /><h3>No alerts yet</h3>
        <p className="muted">Run a search, then press &ldquo;Alert me about jobs like this&rdquo;.</p>
        <a className="btn btn-primary" href="/jobs">Start a search</a></div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      {alerts.map((a) => (
        <div key={a.id} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <strong style={{ color: "var(--text-strong)" }}>{a.name}</strong>
              <div className="small muted">{describeFilters(a.filters)} · {a.frequency} · {a.active ? "active" : "paused"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm btn-ghost" onClick={async () => {
                setPreviews((p) => ({ ...p, [a.id]: "loading" }));
                const { results } = await api<{ results: PublicJob[] }>(`/me/alerts/${a.id}/preview`);
                setPreviews((p) => ({ ...p, [a.id]: results }));
              }}>Preview matches</button>
              <button className="btn btn-sm btn-ghost" onClick={async () => {
                await api("/me/alerts/" + a.id, { method: "PATCH", body: { active: !a.active } });
                load();
              }}>{a.active ? "Pause" : "Resume"}</button>
              <button className="btn btn-sm btn-danger" onClick={async () => {
                await api("/me/alerts/" + a.id, { method: "DELETE" });
                toast("Alert deleted");
                load();
              }}>Delete</button>
            </div>
          </div>
          {previews[a.id] && (
            <div style={{ marginTop: 14 }}>
              {previews[a.id] === "loading" ? <Skeletons n={2} /> : (
                <>
                  <p className="small muted">What the next digest would include:</p>
                  {(previews[a.id] as PublicJob[]).length
                    ? <div className="results-list">{(previews[a.id] as PublicJob[]).map((j) => <JobCard key={j.id} j={j} compact />)}</div>
                    : <p className="muted small">Nothing new yet — we only send genuinely new roles.</p>}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
