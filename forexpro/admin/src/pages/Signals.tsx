import React, { useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useCollection, orderBy, limit } from '../hooks/useCollection';
import { ms, PAIRS, TIMEFRAMES, type AdminSignal } from '../lib/types';
import { computeRR, formatPair, formatPrice, pipSize, timeAgo } from '../lib/format';
import {
  Badge,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  TableSkeleton,
  errorMessage,
  useToast,
} from '../components/ui';

type Draft = {
  pair: string;
  direction: 'buy' | 'sell';
  entry: string;
  stopLoss: string;
  tp1: string;
  tp2: string;
  tp3: string;
  timeframe: string;
  strategy: string;
  confidence: 'low' | 'medium' | 'high';
  chartUrl: string;
  technical: string;
  fundamental: string;
  isPremium: boolean;
  publish: boolean;
};

const EMPTY_DRAFT: Draft = {
  pair: 'EURUSD',
  direction: 'buy',
  entry: '',
  stopLoss: '',
  tp1: '',
  tp2: '',
  tp3: '',
  timeframe: 'H4',
  strategy: '',
  confidence: 'medium',
  chartUrl: '',
  technical: '',
  fundamental: '',
  isPremium: false,
  publish: true,
};

/**
 * Signal management: compose, publish and drive the trade lifecycle.
 *
 * Risk/reward is computed from the levels rather than typed, so the figure the
 * app shows can never contradict the prices next to it.
 */
export function Signals() {
  const toast = useToast();
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'premium'>('all');

  const { data, loading, error } = useCollection<AdminSignal>(
    'signals',
    (doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        pair: d.pair ?? '',
        direction: d.direction ?? 'buy',
        entry: d.entry ?? 0,
        stopLoss: d.stopLoss ?? 0,
        takeProfits: Array.isArray(d.takeProfits) ? d.takeProfits : [],
        riskReward: d.riskReward,
        timeframe: d.timeframe ?? '',
        strategy: d.strategy,
        confidence: d.confidence ?? 'medium',
        chartUrl: d.chartUrl,
        analysis: d.analysis,
        status: d.status ?? 'published',
        tradeState: d.tradeState ?? 'pending',
        result: d.result,
        pips: d.pips,
        isPremium: d.isPremium === true,
        authorName: d.authorName ?? '',
        publishedAt: ms(d.publishedAt),
      };
    },
    [orderBy('publishedAt', 'desc'), limit(150)],
    ['signals-list'],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    if (filter === 'premium') return data.filter((s) => s.isPremium);
    const open = ['pending', 'active'];
    return data.filter((s) =>
      filter === 'open' ? open.includes(s.tradeState) : !open.includes(s.tradeState),
    );
  }, [data, filter]);

  const parsedLevels = useMemo(() => {
    const entry = Number.parseFloat(draft.entry);
    const stopLoss = Number.parseFloat(draft.stopLoss);
    const takeProfits = [draft.tp1, draft.tp2, draft.tp3]
      .map((v, i) => ({ level: i + 1, price: Number.parseFloat(v), hit: false }))
      .filter((tp) => Number.isFinite(tp.price) && tp.price > 0);
    return { entry, stopLoss, takeProfits };
  }, [draft.entry, draft.stopLoss, draft.tp1, draft.tp2, draft.tp3]);

  const previewRR = useMemo(
    () =>
      Number.isFinite(parsedLevels.entry) && Number.isFinite(parsedLevels.stopLoss)
        ? computeRR(parsedLevels.entry, parsedLevels.stopLoss, parsedLevels.takeProfits)
        : undefined,
    [parsedLevels],
  );

  const validate = (): string | null => {
    const { entry, stopLoss, takeProfits } = parsedLevels;
    if (!Number.isFinite(entry) || entry <= 0) return 'Enter a valid entry price.';
    if (!Number.isFinite(stopLoss) || stopLoss <= 0) return 'Enter a valid stop loss.';
    if (takeProfits.length === 0) return 'Add at least one take profit.';
    if (entry === stopLoss) return 'The stop loss cannot equal the entry.';

    // A stop on the wrong side of entry is the single most damaging typo here.
    if (draft.direction === 'buy' && stopLoss >= entry) {
      return 'For a buy, the stop loss must be below the entry.';
    }
    if (draft.direction === 'sell' && stopLoss <= entry) {
      return 'For a sell, the stop loss must be above the entry.';
    }
    const badTarget = takeProfits.find((tp) =>
      draft.direction === 'buy' ? tp.price <= entry : tp.price >= entry,
    );
    if (badTarget) {
      return `Take profit ${badTarget.level} is on the wrong side of the entry.`;
    }
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    setFormError(validationError);
    if (validationError) return;

    setSaving(true);
    try {
      const { entry, stopLoss, takeProfits } = parsedLevels;
      const publishedAt = serverTimestamp();

      await addDoc(collection(db, 'signals'), {
        pair: draft.pair,
        direction: draft.direction,
        entry,
        stopLoss,
        takeProfits,
        riskReward: computeRR(entry, stopLoss, takeProfits) ?? null,
        timeframe: draft.timeframe,
        strategy: draft.strategy.trim(),
        confidence: draft.confidence,
        chartUrl: draft.chartUrl.trim(),
        analysis: {
          technical: draft.technical.trim(),
          fundamental: draft.fundamental.trim(),
        },
        status: draft.publish ? 'published' : 'draft',
        tradeState: 'pending',
        isPremium: draft.isPremium,
        timeline: [{ state: 'published', at: new Date() }],
        authorId: auth.currentUser?.uid ?? 'admin',
        authorName: auth.currentUser?.displayName ?? 'FX Pulse Desk',
        tags: [draft.pair],
        publishedAt,
        createdAt: publishedAt,
      });

      toast.success(draft.publish ? 'Signal published' : 'Draft saved');
      setComposerOpen(false);
      setDraft(EMPTY_DRAFT);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  /** Moves a trade through its lifecycle and stamps the timeline. */
  const advance = async (
    signal: AdminSignal,
    state: AdminSignal['tradeState'],
    result?: AdminSignal['result'],
  ) => {
    try {
      const pips =
        result && Number.isFinite(signal.entry)
          ? computeClosedPips(signal, state)
          : undefined;

      await updateDoc(doc(db, 'signals', signal.id), {
        tradeState: state,
        ...(result ? { result } : {}),
        ...(pips !== undefined ? { pips } : {}),
        ...(state === 'tp_hit' || state === 'sl_hit' || state === 'closed'
          ? { closedAt: serverTimestamp() }
          : {}),
        timeline: arrayUnion({ state, at: new Date() }),
        updatedAt: serverTimestamp(),
      });
      toast.success(`Marked as ${state.replace('_', ' ')}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (signal: AdminSignal) => {
    if (!window.confirm(`Delete the ${formatPair(signal.pair)} signal? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, 'signals', signal.id));
      toast.success('Signal deleted');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Signals</h1>
          <p className="page-sub">{data.length} published</p>
        </div>
        <button className="btn" onClick={() => setComposerOpen(true)}>
          + New signal
        </button>
      </div>

      <div className="toolbar" style={{ marginTop: 20 }}>
        <select className="select" style={{ maxWidth: 190 }} value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All signals</option>
          <option value="open">Open trades</option>
          <option value="closed">Closed</option>
          <option value="premium">Premium only</option>
        </select>
        <div className="spacer" />
        <span className="hint">{filtered.length} shown</span>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No signals" message="Publish your first signal to get started." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pair</th>
                <th>Side</th>
                <th>Entry</th>
                <th>SL</th>
                <th>Targets</th>
                <th>R:R</th>
                <th>State</th>
                <th>Published</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((signal) => (
                <tr key={signal.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="cell-name mono">{formatPair(signal.pair)}</span>
                      {signal.isPremium && <Badge tone="premium">P</Badge>}
                    </div>
                    <div className="cell-sub">{signal.timeframe}</div>
                  </td>
                  <td>
                    <Badge tone={signal.direction === 'buy' ? 'profit' : 'loss'}>{signal.direction}</Badge>
                  </td>
                  <td className="mono">{formatPrice(signal.entry, signal.pair)}</td>
                  <td className="mono" style={{ color: 'var(--loss)' }}>
                    {formatPrice(signal.stopLoss, signal.pair)}
                  </td>
                  <td className="mono" style={{ color: 'var(--profit)' }}>
                    {signal.takeProfits.map((tp) => formatPrice(tp.price, signal.pair)).join(' · ') || '—'}
                  </td>
                  <td className="mono">{signal.riskReward ? `1:${signal.riskReward}` : '—'}</td>
                  <td>
                    <Badge
                      tone={
                        signal.tradeState === 'tp_hit'
                          ? 'profit'
                          : signal.tradeState === 'sl_hit'
                            ? 'loss'
                            : signal.tradeState === 'active'
                              ? 'info'
                              : signal.tradeState === 'pending'
                                ? 'warning'
                                : 'neutral'
                      }
                    >
                      {signal.tradeState.replace('_', ' ')}
                    </Badge>
                    {signal.pips !== undefined && (
                      <div className="cell-sub mono">
                        {signal.pips > 0 ? '+' : ''}
                        {Math.round(signal.pips * 10) / 10} pips
                      </div>
                    )}
                  </td>
                  <td className="cell-sub">{timeAgo(signal.publishedAt)}</td>
                  <td className="actions">
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      {signal.tradeState === 'pending' && (
                        <button className="btn btn-secondary btn-sm" onClick={() => void advance(signal, 'active')}>
                          Entry hit
                        </button>
                      )}
                      {(signal.tradeState === 'active' || signal.tradeState === 'pending') && (
                        <>
                          <button
                            className="btn btn-sm"
                            onClick={() => void advance(signal, 'tp_hit', 'win')}
                          >
                            TP
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => void advance(signal, 'sl_hit', 'loss')}
                          >
                            SL
                          </button>
                        </>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => void remove(signal)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {composerOpen && (
        <Modal
          title="New signal"
          onClose={() => setComposerOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setComposerOpen(false)}>
                Cancel
              </button>
              <button className="btn" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : draft.publish ? 'Publish signal' : 'Save draft'}
              </button>
            </>
          }
        >
          <div className="form-grid">
            <Field label="Pair">
              <select className="select" value={draft.pair} onChange={(e) => set('pair', e.target.value)}>
                {PAIRS.map((pair) => (
                  <option key={pair} value={pair}>
                    {formatPair(pair)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Direction">
              <select
                className="select"
                value={draft.direction}
                onChange={(e) => set('direction', e.target.value as 'buy' | 'sell')}
              >
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </Field>

            <Field label="Timeframe">
              <select className="select" value={draft.timeframe} onChange={(e) => set('timeframe', e.target.value)}>
                {TIMEFRAMES.map((tf) => (
                  <option key={tf} value={tf}>
                    {tf}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Confidence" hint="Qualitative only — never a probability.">
              <select
                className="select"
                value={draft.confidence}
                onChange={(e) => set('confidence', e.target.value as Draft['confidence'])}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Entry">
              <input className="input mono" inputMode="decimal" value={draft.entry} onChange={(e) => set('entry', e.target.value)} placeholder="1.09120" />
            </Field>
            <Field label="Stop loss">
              <input className="input mono" inputMode="decimal" value={draft.stopLoss} onChange={(e) => set('stopLoss', e.target.value)} placeholder="1.08680" />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Take profit 1">
              <input className="input mono" inputMode="decimal" value={draft.tp1} onChange={(e) => set('tp1', e.target.value)} placeholder="1.09580" />
            </Field>
            <Field label="Take profit 2">
              <input className="input mono" inputMode="decimal" value={draft.tp2} onChange={(e) => set('tp2', e.target.value)} placeholder="optional" />
            </Field>
            <Field label="Take profit 3">
              <input className="input mono" inputMode="decimal" value={draft.tp3} onChange={(e) => set('tp3', e.target.value)} placeholder="optional" />
            </Field>
          </div>

          <div className="card card-flat" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="cell-sub">Computed risk / reward</span>
            <strong className="mono" style={{ color: previewRR ? 'var(--primary)' : 'var(--text-tertiary)' }}>
              {previewRR ? `1:${previewRR}` : '—'}
            </strong>
          </div>

          <Field label="Strategy">
            <input className="input" value={draft.strategy} onChange={(e) => set('strategy', e.target.value)} placeholder="Demand zone retest" />
          </Field>

          <Field label="Chart image URL" hint="Upload to Storage under /signals and paste the download URL.">
            <input className="input" value={draft.chartUrl} onChange={(e) => set('chartUrl', e.target.value)} placeholder="https://…" />
          </Field>

          <Field label="Technical analysis">
            <textarea className="textarea" value={draft.technical} onChange={(e) => set('technical', e.target.value)} placeholder="Structure, levels and the invalidation." />
          </Field>

          <Field label="Fundamental analysis">
            <textarea className="textarea" value={draft.fundamental} onChange={(e) => set('fundamental', e.target.value)} placeholder="Macro backdrop and event risk." />
          </Field>

          <label className="checkbox">
            <input type="checkbox" checked={draft.isPremium} onChange={(e) => set('isPremium', e.target.checked)} />
            Premium only — free members see a locked preview with no levels
          </label>

          <label className="checkbox">
            <input type="checkbox" checked={draft.publish} onChange={(e) => set('publish', e.target.checked)} />
            Publish immediately and notify subscribers
          </label>

          {formError && <div className="error">{formError}</div>}
        </Modal>
      )}
    </div>
  );
}

/** Pips captured when a trade closes at its stop or first target. */
function computeClosedPips(signal: AdminSignal, state: AdminSignal['tradeState']): number | undefined {
  const size = pipSize(signal.pair);
  if (!size) return undefined;

  if (state === 'sl_hit') {
    return -Math.abs(signal.entry - signal.stopLoss) / size;
  }
  if (state === 'tp_hit') {
    const target = signal.takeProfits[0]?.price;
    if (!target) return undefined;
    return Math.abs(target - signal.entry) / size;
  }
  return undefined;
}
