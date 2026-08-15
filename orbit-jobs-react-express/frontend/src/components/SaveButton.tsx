/** Heart save-toggle with the in-context sign-in gate. */
import { useUser } from "./providers";
import { IconHeart } from "@/lib/icons";
import type { CSSProperties } from "react";

export function SaveButton({ jobId, className, style }: { jobId: string; className?: string; style?: CSSProperties }) {
  const { saves, toggleSave } = useUser();
  const on = saves.has(jobId);
  return (
    <button
      className={(className || "save-btn") + (on ? " saved" : "")}
      style={style}
      aria-pressed={on}
      aria-label={on ? "Remove from saved jobs" : "Save job"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave(jobId); }}
    >
      <IconHeart />
    </button>
  );
}
