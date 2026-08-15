/** Formatting helpers shared by server and client components. */
import type { Salary } from "./types";

export function money(n: number, currency?: string): string {
  return (currency === "USD" ? "$" : "£") + Number(n).toLocaleString("en-GB");
}

export function salaryText(s: Salary | undefined | null): string | null {
  if (!s || !s.disclosed || !(s.min || s.max)) return null;
  const per = { year: "a year", day: "a day", hour: "an hour" }[s.period] || "";
  if (s.min && s.max && s.min !== s.max) return `${money(s.min, s.currency)}–${money(s.max, s.currency)} ${per}`;
  return `${money((s.max || s.min)!, s.currency)} ${per}`;
}

export function timeAgo(isoDate: string | null): string {
  if (!isoDate) return "—";
  const d = Math.floor((Date.now() - Date.parse(isoDate)) / 864e5);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 7) return d + " days ago";
  if (d < 28) return Math.floor(d / 7) + (d < 14 ? " week ago" : " weeks ago");
  return new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function dateShort(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
}

export function dateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
