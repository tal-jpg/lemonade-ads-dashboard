import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useCollection, orderBy, limit } from '../hooks/useCollection';
import { ms, type AdminPoll } from '../lib/types';
import { timeAgo } from '../lib/format';
import {
  Badge,
  EmptyState,
  Field,
  Modal,
  TableSkeleton,
  errorMessage,
  useToast,
} from '../components/ui';

/**
 * Polls.
 *
 * Tallies are read-only here — votes are counted by the `castVote` Cloud
 * Function inside a transaction, so nothing in this dashboard can skew a result.
 */
export function Polls() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    question: '',
    description: '',
    type: 'trading',
    allowMultiple: false,
    options: ['Bullish', 'Bearish', 'Sideways'],
    days: '7',
  });

  const { data, loading } = useCollection<AdminPoll>(
    'polls',
    (d) => {
      const v = d.data();
      return {
        id: d.id,
        question: v.question ?? '',
        type: v.type ?? 'trading',
        options: Array.isArray(v.options) ? v.options : [],
        totalVotes: v.totalVotes ?? 0,
        isActive: v.isActive !== false,
        allowMultiple: v.allowMultiple === true,
        createdAt: ms(v.createdAt),
      };
    },
    [orderBy('createdAt', 'desc'), limit(50)],
    ['polls-list'],
  );

  const create = async () => {
    const options = draft.options.map((o) => o.trim()).filter(Boolean);
    if (!draft.question.trim() || options.length < 2) {
      toast.error('A question and at least two options are required.');
      return;
    }
    setSaving(true);
    try {
      const days = Number.parseInt(draft.days, 10);
      await addDoc(collection(db, 'polls'), {
        question: draft.question.trim(),
        description: draft.description.trim(),
        type: draft.type,
        options: options.map((label, i) => ({ id: `opt${i + 1}`, label, votes: 0 })),
        totalVotes: 0,
        allowMultiple: draft.allowMultiple,
        isActive: true,
        expiresAt: Number.isFinite(days) && days > 0 ? Date.now() + days * 86_400_000 : null,
        createdBy: auth.currentUser?.uid ?? 'admin',
        createdAt: serverTimestamp(),
      });
      toast.success('Poll published');
      setOpen(false);
      setDraft({ ...draft, question: '', description: '' });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (poll: AdminPoll) => {
    try {
      await updateDoc(doc(db, 'polls', poll.id), { isActive: !poll.isActive });
      toast.success(poll.isActive ? 'Poll closed' : 'Poll reopened');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Polls</h1>
          <p className="page-sub">{data.filter((p) => p.isActive).length} active</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          + New poll
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        {loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : data.length === 0 ? (
          <EmptyState title="No polls yet" message="Ask the community where a pair is heading." />
        ) : (
          <div className="grid grid-2">
            {data.map((poll) => (
              <div key={poll.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <Badge tone={poll.isActive ? 'profit' : 'neutral'}>
                    {poll.isActive ? 'Active' : 'Closed'}
                  </Badge>
                  <span className="cell-sub">{timeAgo(poll.createdAt)}</span>
                </div>

                <div style={{ fontWeight: 600, marginTop: 10 }}>{poll.question}</div>

                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {poll.options.map((option) => {
                    const pct =
                      poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
                    return (
                      <div key={option.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                          <span>{option.label}</span>
                          <span className="mono">
                            {option.votes} · {pct}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: 'var(--surface-high)',
                            borderRadius: 4,
                            marginTop: 4,
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <span className="cell-sub">{poll.totalVotes} votes</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => void toggleActive(poll)}>
                    {poll.isActive ? 'Close poll' : 'Reopen'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {open && (
        <Modal
          title="New poll"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn" onClick={create} disabled={saving}>
                {saving ? 'Publishing…' : 'Publish poll'}
              </button>
            </>
          }
        >
          <Field label="Question">
            <input
              className="input"
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              placeholder="Where do you think EUR/USD is heading today?"
            />
          </Field>

          <Field label="Description">
            <input
              className="input"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Optional context"
            />
          </Field>

          <Field label="Options">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {draft.options.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    value={option}
                    onChange={(e) => {
                      const next = [...draft.options];
                      next[index] = e.target.value;
                      setDraft({ ...draft, options: next });
                    }}
                  />
                  {draft.options.length > 2 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() =>
                        setDraft({ ...draft, options: draft.options.filter((_, i) => i !== index) })
                      }
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {draft.options.length < 8 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDraft({ ...draft, options: [...draft.options, ''] })}
                >
                  + Add option
                </button>
              )}
            </div>
          </Field>

          <div className="form-grid">
            <Field label="Type">
              <select className="select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="trading">Trading</option>
                <option value="multi">Community</option>
              </select>
            </Field>
            <Field label="Closes after (days)">
              <input className="input mono" value={draft.days} onChange={(e) => setDraft({ ...draft, days: e.target.value })} />
            </Field>
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.allowMultiple}
              onChange={(e) => setDraft({ ...draft, allowMultiple: e.target.checked })}
            />
            Allow multiple selections
          </label>
        </Modal>
      )}
    </div>
  );
}
