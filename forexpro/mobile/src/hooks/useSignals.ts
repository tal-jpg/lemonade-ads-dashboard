import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DailyBrief, DailyStats, Signal, SignalTeaser, TradeState } from '../types/models';
import {
  observeSignals,
  observeSignal,
  observeLatestSignal,
  observePremiumTeasers,
  observeTodayStats,
  observeDailyBrief,
  fetchSignalPage,
  type SignalCursor,
} from '../services/firebase/signalRepo';
import { useIsPremium } from '../store/authStore';
import { useAppSettings } from './useAppSettings';
import { toAppError } from '../utils/errors';

export type SignalFilter = 'all' | 'active' | 'closed';

/**
 * The signal feed.
 *
 * Free accounts subscribe to a capped window (`freeHistoryLimit`) and can page
 * no further; premium accounts page indefinitely. The cap is a remote setting,
 * never a constant in this file.
 */
export function useSignals(filter: SignalFilter = 'all') {
  const isPremium = useIsPremium();
  const settings = useAppSettings();
  const historyLimit = isPremium ? 50 : settings.signalLimits.freeHistoryLimit;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [older, setOlder] = useState<Signal[]>([]);
  const [cursor, setCursor] = useState<SignalCursor>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(isPremium);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = observeSignals(
      { canReadPremium: isPremium, historyLimit },
      (next) => {
        setSignals(next);
        setLoading(false);
      },
      (err) => {
        setError(toAppError(err).message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [isPremium, historyLimit]);

  const loadMore = useCallback(async () => {
    // The free tier's history is intentionally capped — paging is a premium
    // capability, surfaced in the UI as an upgrade prompt rather than a button
    // that silently does nothing.
    if (!isPremium || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchSignalPage(isPremium, cursor ?? null);
      setOlder((prev) => [...prev, ...page.signals]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, isPremium, loadingMore]);

  const combined = useMemo(() => {
    const seen = new Set(signals.map((s) => s.id));
    const merged = [...signals, ...older.filter((s) => !seen.has(s.id))];
    if (filter === 'all') return merged;
    const openStates: TradeState[] = ['pending', 'active'];
    return merged.filter((s) =>
      filter === 'active' ? openStates.includes(s.tradeState) : !openStates.includes(s.tradeState),
    );
  }, [signals, older, filter]);

  const counts = useMemo(() => {
    const open: TradeState[] = ['pending', 'active'];
    return {
      all: signals.length,
      active: signals.filter((s) => open.includes(s.tradeState)).length,
      closed: signals.filter((s) => !open.includes(s.tradeState)).length,
    };
  }, [signals]);

  return {
    signals: combined,
    counts,
    loading,
    loadingMore,
    error,
    hasMore: isPremium && hasMore,
    loadMore,
    /** True when the free tier has more history behind the paywall. */
    cappedByPlan: !isPremium && signals.length >= historyLimit,
  };
}

export function useSignal(id: string | undefined) {
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsubscribe = observeSignal(
      id,
      (next) => {
        setSignal(next);
        setLoading(false);
      },
      (err) => {
        const mapped = toAppError(err);
        // A permission error here means the signal is premium and the caller is
        // not — the screen renders the paywall rather than an error.
        setError(mapped.code === 'permission-denied' ? 'premium' : mapped.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [id]);

  return { signal, loading, error, isLocked: error === 'premium' };
}

export function useLatestSignal() {
  const isPremium = useIsPremium();
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = observeLatestSignal(
      isPremium,
      (next) => {
        setSignal(next);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsubscribe;
  }, [isPremium]);

  return { signal, loading };
}

/** Locked previews of today's premium signals — free accounts only. */
export function usePremiumTeasers() {
  const isPremium = useIsPremium();
  const [teasers, setTeasers] = useState<SignalTeaser[]>([]);

  useEffect(() => {
    if (isPremium) {
      setTeasers([]);
      return;
    }
    return observePremiumTeasers(setTeasers);
  }, [isPremium]);

  return teasers;
}

export function useTodayStats(): { stats: DailyStats | null; loading: boolean } {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeTodayStats((next) => {
      setStats(next);
      setLoading(false);
    });
  }, []);

  return { stats, loading };
}

export function useDailyBrief(): { brief: DailyBrief | null; loading: boolean } {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeDailyBrief((next) => {
      setBrief(next);
      setLoading(false);
    });
  }, []);

  return { brief, loading };
}
