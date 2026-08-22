import {
  onSnapshot,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  collection,
  type QueryDocumentSnapshot,
  type DocumentData,
} from '@react-native-firebase/firestore';
import { db } from './client';
import { refs } from './paths';
import { mapSignal, mapDailyStats, mapDailyBrief, ms } from './mappers';
import type { DailyBrief, DailyStats, Signal, SignalTeaser } from '../../types/models';
import { serviceError } from '../../utils/errors';
import { dayKey, startOfTodayMs } from '../../utils/date';
import { DEMO_MODE } from '../../config/demo';
import * as demo from '../demo/repos';

/**
 * Signals.
 *
 * Free accounts cannot read premium signal documents at all — the security
 * rules reject them, so the client query narrows to `isPremium == false` to
 * avoid a permission error. Locked previews are built from `signal_teasers`,
 * a server-written projection that deliberately contains no tradable level.
 */

const PAGE_SIZE = 20;

export type SignalCursor = QueryDocumentSnapshot<DocumentData> | null;

export type SignalPage = {
  signals: Signal[];
  cursor: SignalCursor;
  hasMore: boolean;
};

function baseQuery(canReadPremium: boolean) {
  const constraints = [
    where('status', '==', 'published'),
    ...(canReadPremium ? [] : [where('isPremium', '==', false)]),
    orderBy('publishedAt', 'desc'),
  ];
  return query(refs.signals(), ...constraints);
}

/**
 * Live feed of the most recent signals.
 * `historyLimit` implements the free-tier scroll-back cap from app settings.
 */
export function observeSignals(
  opts: { canReadPremium: boolean; historyLimit: number },
  onData: (signals: Signal[]) => void,
  onError: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeSignals(opts, onData);
  const q = query(baseQuery(opts.canReadPremium), limit(opts.historyLimit));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map(mapSignal).filter((s): s is Signal => s !== null));
    },
    (err) => onError(err),
  );
}

export async function fetchSignalPage(
  canReadPremium: boolean,
  cursor: SignalCursor,
): Promise<SignalPage> {
  if (DEMO_MODE) return demo.fetchSignalPage(canReadPremium);
  try {
    const q = cursor
      ? query(baseQuery(canReadPremium), startAfter(cursor), limit(PAGE_SIZE))
      : query(baseQuery(canReadPremium), limit(PAGE_SIZE));

    const snap = await getDocs(q);
    const signals = snap.docs.map(mapSignal).filter((s): s is Signal => s !== null);
    return {
      signals,
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length === PAGE_SIZE,
    };
  } catch (err) {
    throw serviceError(err, 'Could not load signals.');
  }
}

export function observeSignal(
  id: string,
  onData: (signal: Signal | null) => void,
  onError: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeSignal(id, onData);
  return onSnapshot(
    refs.signal(id),
    (snap) => onData(mapSignal(snap)),
    (err) => onError(err),
  );
}

export async function fetchSignal(id: string): Promise<Signal | null> {
  try {
    return mapSignal(await getDoc(refs.signal(id)));
  } catch (err) {
    throw serviceError(err, 'Could not load this signal.');
  }
}

/** Newest signal the caller is allowed to see — powers the home hero card. */
export function observeLatestSignal(
  canReadPremium: boolean,
  onData: (signal: Signal | null) => void,
  onError: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeLatestSignal(canReadPremium, onData);
  return onSnapshot(
    query(baseQuery(canReadPremium), limit(1)),
    (snap) => onData(snap.docs.length ? mapSignal(snap.docs[0]) : null),
    (err) => onError(err),
  );
}

/**
 * Locked previews of today's premium signals, for free accounts.
 * Contains pair, direction and confidence only — never entry, stop or target.
 */
export function observePremiumTeasers(
  onData: (teasers: SignalTeaser[]) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observePremiumTeasers(onData);
  const q = query(
    collection(db(), 'signal_teasers'),
    where('publishedAt', '>=', new Date(startOfTodayMs())),
    orderBy('publishedAt', 'desc'),
    limit(10),
  );
  return onSnapshot(
    q,
    (snap) => {
      const teasers = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          pair: String(data.pair ?? '—').toUpperCase(),
          direction: data.direction === 'sell' ? ('sell' as const) : ('buy' as const),
          timeframe: String(data.timeframe ?? 'H1'),
          confidence:
            data.confidence === 'high' || data.confidence === 'low'
              ? (data.confidence as 'high' | 'low')
              : ('medium' as const),
          publishedAt: ms(data.publishedAt, Date.now()),
        };
      });
      onData(teasers);
    },
    (err) => onError?.(err),
  );
}

/** Today's performance rollup: wins, losses, win rate, average R:R. */
export function observeTodayStats(
  onData: (stats: DailyStats | null) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeTodayStats(onData);
  return onSnapshot(
    refs.dailyStat(dayKey()),
    (snap) => onData(mapDailyStats(snap)),
    (err) => onError?.(err),
  );
}

export function observeDailyBrief(
  onData: (brief: DailyBrief | null) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeDailyBrief(onData);
  return onSnapshot(
    refs.dailyBrief(dayKey()),
    (snap) => onData(mapDailyBrief(snap)),
    (err) => onError?.(err),
  );
}

/** How many signals the caller has already received today, for the tier meter. */
export async function countSignalsToday(canReadPremium: boolean): Promise<number> {
  if (DEMO_MODE) return demo.countSignalsToday(canReadPremium);
  try {
    const q = query(
      refs.signals(),
      where('status', '==', 'published'),
      ...(canReadPremium ? [] : [where('isPremium', '==', false)]),
      where('publishedAt', '>=', new Date(startOfTodayMs())),
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch {
    return 0;
  }
}
