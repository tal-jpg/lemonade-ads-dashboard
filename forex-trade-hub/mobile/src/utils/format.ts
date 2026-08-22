/**
 * Value formatting.
 *
 * Prices are rendered with the pair's own precision (JPY crosses use 3, metals
 * use 2, everything else 5) so a quote never looks wrong to a trader.
 */

/** Decimal places for a symbol. */
export function digitsFor(symbol: string): number {
  const s = symbol.toUpperCase().replace('/', '');
  if (s.startsWith('XAU') || s.startsWith('XAG')) return 2;
  if (s.endsWith('JPY')) return 3;
  if (s.startsWith('BTC') || s.startsWith('ETH')) return 1;
  return 5;
}

/** One pip, expressed in price units, for the given symbol. */
export function pipSize(symbol: string): number {
  const s = symbol.toUpperCase().replace('/', '');
  if (s.startsWith('XAU')) return 0.1;
  if (s.startsWith('XAG')) return 0.01;
  if (s.endsWith('JPY')) return 0.01;
  return 0.0001;
}

export function formatPrice(value: number | undefined | null, symbolOrDigits: string | number): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  const digits = typeof symbolOrDigits === 'number' ? symbolOrDigits : digitsFor(symbolOrDigits);
  return value.toFixed(digits);
}

export function formatPips(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

/** Distance between two prices, in pips. */
export function pipsBetween(a: number, b: number, symbol: string): number {
  return Math.abs(a - b) / pipSize(symbol);
}

export function formatPct(value: number | undefined | null, digits = 2, signed = true): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatSigned(value: number | undefined | null, digits = 2): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

/** 12500 -> "12.5K", 1_240_000 -> "1.2M" */
export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

export function formatRiskReward(rr: number | undefined | null): string {
  if (rr === undefined || rr === null || !Number.isFinite(rr) || rr <= 0) return '—';
  const rounded = Math.round(rr * 10) / 10;
  return `1:${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}`;
}

/**
 * Risk/reward implied by the levels, using the furthest take-profit.
 * Returns undefined when the stop is at (or the wrong side of) entry.
 */
export function computeRiskReward(
  entry: number,
  stopLoss: number,
  takeProfits: { price: number }[],
): number | undefined {
  const risk = Math.abs(entry - stopLoss);
  if (!Number.isFinite(risk) || risk === 0 || takeProfits.length === 0) return undefined;
  const furthest = takeProfits.reduce(
    (max, tp) => Math.max(max, Math.abs(tp.price - entry)),
    0,
  );
  if (furthest === 0) return undefined;
  return furthest / risk;
}

export function formatPairLabel(pair: string): string {
  const s = pair.toUpperCase().replace('/', '');
  if (s.length === 6) return `${s.slice(0, 3)}/${s.slice(3)}`;
  return pair.toUpperCase();
}

export function initials(name: string | undefined | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function truncate(text: string | undefined | null, max: number): string {
  if (!text) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 92_000 -> "1:32" */
export function formatDuration(ms: number | undefined): string {
  if (!ms || ms < 0) return '0:00';
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Percentage 0..100 for a progress bar, guarded against divide-by-zero. */
export function progressPct(done: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.max(0, Math.min(100, (done / total) * 100));
}
