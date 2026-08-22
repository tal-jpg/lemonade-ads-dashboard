import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  isThisYear,
  startOfDay,
} from 'date-fns';
import type { Millis } from '../types/models';

export function toDate(ms: Millis | undefined | null): Date | null {
  if (!ms || !Number.isFinite(ms)) return null;
  return new Date(ms);
}

/** "2m ago", "4h ago", "3d ago". */
export function timeAgo(ms: Millis | undefined | null): string {
  const d = toDate(ms);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  return `${formatDistanceToNowStrict(d, { roundingMethod: 'floor' })} ago`;
}

/** "14:32" */
export function timeOfDay(ms: Millis | undefined | null): string {
  const d = toDate(ms);
  return d ? format(d, 'HH:mm') : '';
}

/** "Today", "Yesterday", "12 Mar" or "12 Mar 2024". */
export function dayLabel(ms: Millis | undefined | null): string {
  const d = toDate(ms);
  if (!d) return '';
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, isThisYear(d) ? 'd MMM' : 'd MMM yyyy');
}

/** "12 Mar, 14:32" */
export function dateTimeLabel(ms: Millis | undefined | null): string {
  const d = toDate(ms);
  if (!d) return '';
  return `${dayLabel(ms)}, ${format(d, 'HH:mm')}`;
}

/** "12 March 2026" */
export function longDate(ms: Millis | undefined | null): string {
  const d = toDate(ms);
  return d ? format(d, 'd MMMM yyyy') : '';
}

/** Firestore document key for daily rollups. */
export function dayKey(date: Date = new Date()): string {
  return format(startOfDay(date), 'yyyy-MM-dd');
}

export function startOfTodayMs(): Millis {
  return startOfDay(new Date()).getTime();
}

export function greeting(date: Date = new Date()): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Days remaining until `ms`, floored at 0. */
export function daysUntil(ms: Millis | undefined | null): number {
  if (!ms) return 0;
  return Math.max(0, Math.ceil((ms - Date.now()) / 86_400_000));
}

export function isExpired(ms: Millis | undefined | null): boolean {
  return !!ms && ms < Date.now();
}

/**
 * Splits a chronological list into day buckets for chat rendering.
 * Returns newest-first buckets when the input is newest-first.
 */
export function groupByDay<T>(items: T[], getMs: (item: T) => Millis): { key: string; label: string; items: T[] }[] {
  const buckets: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const key = dayKey(new Date(getMs(item)));
    const last = buckets[buckets.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      buckets.push({ key, label: dayLabel(getMs(item)), items: [item] });
    }
  }
  return buckets;
}
