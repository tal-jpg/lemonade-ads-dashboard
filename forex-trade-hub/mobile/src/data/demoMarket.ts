import type { MarketQuote } from '../types/models';

/**
 * Demo market data.
 *
 * Used only until `market_quotes` is populated (see the seed script and the
 * admin panel). Values are realistic mid-2026 levels with plausible intraday
 * ranges so the dashboard looks right during development and in screenshots.
 *
 * The UI labels this state explicitly — a demo quote is never presented as a
 * live price.
 */

function walk(start: number, steps: number, volatility: number, drift: number): number[] {
  // Deterministic pseudo-random walk: the same series every run, so snapshots
  // and screenshots stay stable.
  const out: number[] = [];
  let value = start;
  let seed = Math.round(start * 1000) % 9973;
  for (let i = 0; i < steps; i += 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const noise = (seed / 2147483648) * 2 - 1;
    value += noise * volatility + drift;
    out.push(Number(value.toFixed(6)));
  }
  return out;
}

const now = Date.now();

function quote(
  symbol: string,
  displayName: string,
  price: number,
  changePct: number,
  digits: number,
  volatility: number,
): MarketQuote {
  const change = Number(((price * changePct) / 100).toFixed(digits));
  const sparkline = walk(price - change, 24, volatility, change / 24);
  return {
    symbol,
    displayName,
    price,
    change,
    changePct,
    high: Number((price + Math.abs(change) * 1.4).toFixed(digits)),
    low: Number((price - Math.abs(change) * 1.2).toFixed(digits)),
    sparkline,
    digits,
    updatedAt: now,
  };
}

export const DEMO_QUOTES: MarketQuote[] = [
  quote('EURUSD', 'EUR/USD', 1.09242, 0.18, 5, 0.0006),
  quote('GBPUSD', 'GBP/USD', 1.27815, -0.24, 5, 0.0008),
  quote('USDJPY', 'USD/JPY', 151.482, 0.31, 3, 0.09),
  quote('XAUUSD', 'XAU/USD', 2418.65, 0.92, 2, 2.4),
  quote('GBPJPY', 'GBP/JPY', 193.622, -0.11, 3, 0.14),
  quote('AUDUSD', 'AUD/USD', 0.65934, 0.07, 5, 0.0005),
];

/** Pairs offered in the admin signal composer and the watchlist picker. */
export const TRADABLE_PAIRS = [
  'EURUSD',
  'GBPUSD',
  'USDJPY',
  'USDCHF',
  'USDCAD',
  'AUDUSD',
  'NZDUSD',
  'EURJPY',
  'GBPJPY',
  'EURGBP',
  'XAUUSD',
  'XAGUSD',
  'US30',
  'NAS100',
] as const;

export const TIMEFRAMES = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'] as const;
