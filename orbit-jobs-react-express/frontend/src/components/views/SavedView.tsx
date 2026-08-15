import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import type { PublicJob } from "@/lib/types";
import { JobCard, Skeletons } from "@/components/JobCard";
import { useUser } from "@/components/providers";

export function SavedView() {
  const { user, ready, saves, signInGate } = useUser();
  const [rows, setRows] = useState<{ savedAt: string; expired: boolean; job: PublicJob }[] | null>(null);

  useEffect(() => {
    if (ready && user?.role === "candidate") {
      api<{ results: { savedAt: string; expired: boolean; job: PublicJob }[] }>("/me/saves").then(({ results }) => setRows(results));
    }
  }, [ready, user, saves.size]);

  if (!ready) return <Skeletons n={3} />;
  if (!user || user.role !== "candidate") {
    return (
      <div className="empty card"><div className="ring-illo" /><h3>Your shortlist lives in your free account</h3>
        <p className="muted">Sign in to see saved jobs across devices.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={async () => { if (await signInGate()) window.location.reload(); }}>Sign in</button>
          <a className="btn btn-ghost" href="/account/register">Create account</a></div></div>
    );
  }
  if (!rows) return <Skeletons n={3} />;
  if (!rows.length) {
    return (
      <div className="empty card"><div className="ring-illo" /><h3>Nothing saved yet</h3>
        <p className="muted">Tap the heart on any job to build your shortlist.</p>
        <a className="btn btn-primary" href="/jobs">Browse jobs</a></div>
    );
  }
  return (
    <div className="results-list">
      {rows.map((r) => (
        <div key={r.job.id}>
          {r.expired && <p className="caption" style={{ color: "var(--error)", margin: "0 0 4px" }}>This role has closed</p>}
          <JobCard j={r.job} />
        </div>
      ))}
    </div>
  );
}
