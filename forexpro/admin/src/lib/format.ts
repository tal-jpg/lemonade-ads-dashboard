import type { Millis } from './types';

export function formatDate(ms: Millis | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(ms: Millis | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(ms: Millis | undefined): string {
  if (!ms) return '—';
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(ms);
}

export function digitsFor(symbol: string): number {
  const s = symbol.toUpperCase().replace('/', '');
  if (s.startsWith('XAU') || s.startsWith('XAG')) return 2;
  if (s.endsWith('JPY')) return 3;
  if (s.startsWith('US30') || s.startsWith('NAS')) return 1;
  return 5;
}

export function formatPrice(value: number | undefined, symbol: string): string {
  if (value === undefined || !Number.isFinite(value)) return '—';
  return value.toFixed(digitsFor(symbol));
}

export function formatPair(pair: string): string {
  const s = pair.toUpperCase().replace('/', '');
  return s.length === 6 ? `${s.slice(0, 3)}/${s.slice(3)}` : s;
}

export function pipSize(symbol: string): number {
  const s = symbol.toUpperCase().replace('/', '');
  if (s.startsWith('XAU')) return 0.1;
  if (s.startsWith('XAG')) return 0.01;
  if (s.endsWith('JPY')) return 0.01;
  return 0.0001;
}

/** Risk/reward from the levels, using the furthest target. Undefined if invalid. */
export function computeRR(
  entry: number,
  stopLoss: number,
  takeProfits: { price: number }[],
): number | undefined {
  const risk = Math.abs(entry - stopLoss);
  if (!Number.isFinite(risk) || risk === 0) return undefined;
  const reward = takeProfits.reduce((max, tp) => Math.max(max, Math.abs(tp.price - entry)), 0);
  if (reward === 0) return undefined;
  return Math.round((reward / risk) * 100) / 100;
}

export function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
