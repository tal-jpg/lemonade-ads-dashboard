import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { db, FieldValue } from './common';
import { broadcast } from './notifications';

/**
 * Signal lifecycle: publication fan-out, the public teaser projection and the
 * daily performance rollup.
 */

type TakeProfit = { level: number; price: number; hit?: boolean };

function pipSize(symbol: string): number {
  const s = symbol.toUpperCase().replace('/', '');
  if (s.startsWith('XAU')) return 0.1;
  if (s.startsWith('XAG')) return 0.01;
  if (s.endsWith('JPY')) return 0.01;
  return 0.0001;
}

function formatPair(pair: string): string {
  const s = pair.toUpperCase().replace('/', '');
  return s.length === 6 ? `${s.slice(0, 3)}/${s.slice(3)}` : s;
}

/**
 * On publish: notify the right audience and, for premium signals, write the
 * teaser document that powers the locked card free users see.
 *
 * The teaser deliberately contains no entry, stop or target — it is the only
 * thing about a premium signal that a free account can read.
 */
export const onSignalPublished = onDocumentCreated('signals/{signalId}', async (event) => {
  const snap = event.data;
  if (!snap) return;

  const signal = snap.data();
  if (signal.status !== 'published') return;

  const pair = formatPair(String(signal.pair ?? ''));
  const direction = String(signal.direction ?? 'buy').toUpperCase();
  const isPremium = signal.isPremium === true;

  try {
    if (isPremium) {
      await db.collection('signal_teasers').doc(snap.id).set({
        pair: signal.pair ?? '',
        direction: signal.direction ?? 'buy',
        timeframe: signal.timeframe ?? 'H1',
        confidence: signal.confidence ?? 'medium',
        publishedAt: signal.publishedAt ?? FieldValue.serverTimestamp(),
      });
    }

    await broadcast(isPremium ? 'premium' : 'all', {
      type: isPremium ? 'premium_signal' : 'new_signal',
      title: `${direction} ${pair}`,
      body: isPremium
        ? `New premium signal · ${signal.timeframe ?? ''} · ${signal.confidence ?? 'medium'} confidence`
        : `New signal published · ${signal.timeframe ?? ''}`,
      route: `/signal/${snap.id}`,
      data: { signalId: snap.id, pair: String(signal.pair ?? '') },
    });

    // Free users get a nudge that premium setups exist, without any levels.
    if (isPremium) {
      await broadcast('free', {
        type: 'premium_signal',
        title: `${direction} ${pair} — Premium`,
        body: 'A new premium signal was just published. Upgrade to see the full setup.',
        route: '/premium',
      });
    }

    await bumpDailyStat({ signals: 1 });
  } catch (err) {
    logger.error('onSignalPublished failed', { id: snap.id, err });
  }
});

/**
 * On state change: notify followers of the trade and, once the trade closes,
 * fold the result into the day's rollup.
 */
export const onSignalUpdated = onDocumentUpdated('signals/{signalId}', async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const id = event.params.signalId;
  const pair = formatPair(String(after.pair ?? ''));

  if (before.tradeState === after.tradeState) return;

  const state = String(after.tradeState);
  const audience = after.isPremium === true ? 'premium' : 'all';

  const label: Record<string, string> = {
    active: 'Entry hit — the trade is now live',
    tp_hit: 'Take profit hit',
    sl_hit: 'Stop loss hit',
    closed: 'Trade closed',
    cancelled: 'Signal cancelled',
  };

  if (label[state]) {
    await broadcast(audience, {
      type: 'signal_update',
      title: `${pair} · ${label[state]}`,
      body:
        typeof after.pips === 'number'
          ? `${after.pips > 0 ? '+' : ''}${Math.round(after.pips * 10) / 10} pips`
          : 'Tap to see the updated trade.',
      route: `/signal/${id}`,
      data: { signalId: id },
    });
  }

  // Fold into the daily rollup exactly once, on the transition into a result.
  const wasClosed = ['tp_hit', 'sl_hit', 'closed'].includes(String(before.tradeState));
  const isClosed = ['tp_hit', 'sl_hit', 'closed'].includes(state);
  if (!wasClosed && isClosed) {
    const result = String(after.result ?? (state === 'sl_hit' ? 'loss' : 'win'));
    await bumpDailyStat({
      wins: result === 'win' ? 1 : 0,
      losses: result === 'loss' ? 1 : 0,
      breakeven: result === 'breakeven' ? 1 : 0,
      totalPips: typeof after.pips === 'number' ? after.pips : 0,
      rrSum: typeof after.riskReward === 'number' ? after.riskReward : 0,
      rrCount: typeof after.riskReward === 'number' ? 1 : 0,
    });
  }
});

type StatDelta = {
  signals?: number;
  wins?: number;
  losses?: number;
  breakeven?: number;
  totalPips?: number;
  rrSum?: number;
  rrCount?: number;
};

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Increments today's counters. Win rate and average R:R are derived in a
 * transaction so they can never disagree with the counters they come from.
 */
async function bumpDailyStat(delta: StatDelta): Promise<void> {
  const ref = db.collection('daily_stats').doc(dayKey());

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.data() ?? {} : {};

    const signals = (current.signals ?? 0) + (delta.signals ?? 0);
    const wins = (current.wins ?? 0) + (delta.wins ?? 0);
    const losses = (current.losses ?? 0) + (delta.losses ?? 0);
    const breakeven = (current.breakeven ?? 0) + (delta.breakeven ?? 0);
    const totalPips = (current.totalPips ?? 0) + (delta.totalPips ?? 0);
    const rrSum = (current.rrSum ?? 0) + (delta.rrSum ?? 0);
    const rrCount = (current.rrCount ?? 0) + (delta.rrCount ?? 0);

    const decided = wins + losses;

    tx.set(
      ref,
      {
        signals,
        wins,
        losses,
        breakeven,
        totalPips: Math.round(totalPips * 10) / 10,
        rrSum,
        rrCount,
        winRate: decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0,
        avgRR: rrCount > 0 ? Math.round((rrSum / rrCount) * 100) / 100 : 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

/**
 * Nightly consistency pass.
 *
 * Recomputes yesterday's rollup directly from the signal documents, so a missed
 * trigger or a manual edit in the console cannot leave the published win rate
 * permanently wrong.
 */
export const rebuildDailyStats = onSchedule(
  { schedule: '15 0 * * *', timeZone: 'UTC', region: 'us-central1' },
  async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const start = new Date(yesterday);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const snap = await db
      .collection('signals')
      .where('publishedAt', '>=', start)
      .where('publishedAt', '<', end)
      .get();

    let wins = 0;
    let losses = 0;
    let breakeven = 0;
    let totalPips = 0;
    let rrSum = 0;
    let rrCount = 0;

    snap.docs.forEach((doc) => {
      const d = doc.data();
      if (d.result === 'win') wins += 1;
      else if (d.result === 'loss') losses += 1;
      else if (d.result === 'breakeven') breakeven += 1;
      if (typeof d.pips === 'number') totalPips += d.pips;
      if (typeof d.riskReward === 'number') {
        rrSum += d.riskReward;
        rrCount += 1;
      }
    });

    const decided = wins + losses;
    await db
      .collection('daily_stats')
      .doc(dayKey(start))
      .set(
        {
          signals: snap.size,
          wins,
          losses,
          breakeven,
          totalPips: Math.round(totalPips * 10) / 10,
          rrSum,
          rrCount,
          winRate: decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0,
          avgRR: rrCount > 0 ? Math.round((rrSum / rrCount) * 100) / 100 : 0,
          rebuiltAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    logger.info('daily stats rebuilt', { day: dayKey(start), signals: snap.size });
  },
);

/** Convenience for the admin dashboard when closing a trade by hand. */
export function pipsBetween(a: number, b: number, symbol: string): number {
  return Math.abs(a - b) / pipSize(symbol);
}

export function furthestTakeProfit(entry: number, takeProfits: TakeProfit[]): number {
  return takeProfits.reduce((max, tp) => Math.max(max, Math.abs(tp.price - entry)), 0);
}
