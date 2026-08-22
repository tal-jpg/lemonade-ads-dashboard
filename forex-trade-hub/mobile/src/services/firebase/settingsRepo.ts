import { onSnapshot, getDoc, query, orderBy, limit } from '@react-native-firebase/firestore';
import { refs } from './paths';
import { mapAppSettings, mapQuote } from './mappers';
import { type AppSettings, type MarketQuote, fallbackAppSettings } from '../../types/models';
import { DEMO_QUOTES } from '../../data/demoMarket';
import { DEMO_MODE } from '../../config/demo';
import * as demo from '../demo/repos';

/**
 * Remote settings and market quotes.
 *
 * Every configurable business rule (signal limits, feature flags, store product
 * ids, legal copy) lives in app_settings/config so the admin panel can change
 * it without a release. Nothing here is hardcoded in a screen.
 */

export function observeAppSettings(
  onData: (settings: AppSettings) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeAppSettings(onData);
  return onSnapshot(
    refs.appSettings(),
    (snap) => onData(mapAppSettings(snap)),
    (err) => {
      onError?.(err);
      // Never leave the app without settings — fall back to safe defaults.
      onData(fallbackAppSettings);
    },
  );
}

export async function fetchAppSettings(): Promise<AppSettings> {
  if (DEMO_MODE) return demo.fetchAppSettings();
  try {
    return mapAppSettings(await getDoc(refs.appSettings()));
  } catch {
    return fallbackAppSettings;
  }
}

/**
 * Live market quotes.
 *
 * Phase 1 seeds `market_quotes` from the admin panel (or the seed script) and
 * the app simply mirrors it. Phase 2 swaps the writer for a scheduled function
 * pulling a real feed — no client change required.
 *
 * If the collection is empty (fresh project, before seeding) the demo set is
 * returned so the dashboard is never a blank rectangle.
 */
export function observeMarketQuotes(
  onData: (quotes: MarketQuote[], isDemo: boolean) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeMarketQuotes(onData);
  const q = query(refs.marketQuotes(), orderBy('symbol', 'asc'), limit(12));
  return onSnapshot(
    q,
    (snap) => {
      const quotes = snap.docs.map(mapQuote).filter((x): x is MarketQuote => x !== null);
      if (quotes.length === 0) {
        onData(DEMO_QUOTES, true);
      } else {
        onData(quotes, false);
      }
    },
    (err) => {
      onError?.(err);
      onData(DEMO_QUOTES, true);
    },
  );
}
