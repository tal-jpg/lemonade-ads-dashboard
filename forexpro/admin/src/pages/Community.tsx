import React, { useState } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth, api } from '../lib/firebase';
import { useCollection, orderBy, limit, where } from '../hooks/useCollection';
import { ms, type AdminJoinRequest, type AdminMessage } from '../lib/types';
import { timeAgo } from '../lib/format';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  Field,
  Modal,
  TableSkeleton,
  errorMessage,
  useToast,
} from '../components/ui';

/**
 * Community management: the approval queue, message moderation and
 * announcements.
 */
export function Community() {
  const toast = useToast();
  const [tab, setTab] = useState<'requests' | 'messages' | 'announcements'>('requests');
  const [busy, setBusy] = useState<string | null>(null);

  const { data: requests, loading: requestsLoading, error: requestsError } =
    useCollection<AdminJoinRequest>(
      'join_requests',
      (d) => {
        const v = d.data();
        return {
          uid: d.id,
          fullName: v.fullName ?? '',
          username: v.username ?? '',
          email: v.email ?? '',
          message: v.message,
          status: v.status ?? 'pending',
          createdAt: ms(v.createdAt),
        };
      },
      [orderBy('createdAt', 'desc'), limit(200)],
      ['join-requests'],
    );

  const { data: messages, loading: messagesLoading } = useCollection<AdminMessage>(
    'community/main/messages',
    (d) => {
      const v = d.data();
      return {
        id: d.id,
        authorId: v.authorId ?? '',
        authorName: v.authorName ?? '',
        text: v.text,
        type: v.type ?? 'text',
        pinned: v.pinned === true,
        deleted: v.deleted === true,
        createdAt: ms(v.createdAt),
      };
    },
    [orderBy('createdAt', 'desc'), limit(80)],
    ['community-messages'],
  );

  const pending = requests.filter((r) => r.status === 'pending');

  const decide = async (uid: string, decision: 'approve' | 'reject' | 'block') => {
    setBusy(uid);
    try {
      await api.decideJoinRequest({ uid, decision });
      toast.success(
        decision === 'approve' ? 'Member approved' : decision === 'reject' ? 'Request rejected' : 'User blocked',
      );
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const moderateMessage = async (message: AdminMessage, action: 'pin' | 'unpin' | 'delete') => {
    try {
      if (action === 'delete') {
        await updateDoc(doc(db, 'community', 'main', 'messages', message.id), {
          deleted: true,
          deletedBy: auth.currentUser?.uid ?? 'admin',
          text: '',
          media: null,
        });
        toast.success('Message removed');
        return;
      }
      const pinned = action === 'pin';
      await updateDoc(doc(db, 'community', 'main', 'messages', message.id), { pinned });
      await updateDoc(doc(db, 'community', 'main'), {
        pinnedMessageId: pinned ? message.id : '',
        updatedAt: serverTimestamp(),
      });
      toast.success(pinned ? 'Message pinned' : 'Message unpinned');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div>
      <h1 className="page-title">Community</h1>
      <p className="page-sub">
        {pending.length} pending request{pending.length === 1 ? '' : 's'}
      </p>

      <div className="toolbar" style={{ marginTop: 20 }}>
        {(
          [
            ['requests', `Join requests${pending.length ? ` (${pending.length})` : ''}`],
            ['messages', 'Messages'],
            ['announcements', 'Announcements'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            className={`btn btn-sm ${tab === value ? '' : 'btn-secondary'}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'requests' &&
        (requestsLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : requestsError ? (
          <ErrorState message={requestsError} />
        ) : requests.length === 0 ? (
          <EmptyState title="No join requests" message="Requests appear here as members apply." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.uid}>
                    <td>
                      <div className="cell-user">
                        <Avatar name={request.fullName} />
                        <div>
                          <div className="cell-name">{request.fullName}</div>
                          <div className="cell-sub">
                            @{request.username} · {request.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="cell-sub" style={{ maxWidth: 260 }}>
                      {request.message || '—'}
                    </td>
                    <td>
                      <Badge
                        tone={
                          request.status === 'approved'
                            ? 'profit'
                            : request.status === 'pending'
                              ? 'warning'
                              : 'loss'
                        }
                      >
                        {request.status}
                      </Badge>
                    </td>
                    <td className="cell-sub">{timeAgo(request.createdAt)}</td>
                    <td className="actions">
                      {request.status === 'pending' ? (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            className="btn btn-sm"
                            disabled={busy === request.uid}
                            onClick={() => void decide(request.uid, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            disabled={busy === request.uid}
                            onClick={() => void decide(request.uid, 'reject')}
                          >
                            Reject
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={busy === request.uid}
                            onClick={() => void decide(request.uid, 'block')}
                          >
                            Block
                          </button>
                        </div>
                      ) : (
                        <span className="cell-sub">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'messages' &&
        (messagesLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : messages.length === 0 ? (
          <EmptyState title="No messages" message="The room is quiet." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Author</th>
                  <th>Message</th>
                  <th>Sent</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id} style={{ opacity: message.deleted ? 0.5 : 1 }}>
                    <td>
                      <div className="cell-user">
                        <Avatar name={message.authorName} />
                        <div className="cell-name">{message.authorName}</div>
                      </div>
                    </td>
                    <td style={{ maxWidth: 420 }}>
                      {message.deleted ? (
                        <em className="cell-sub">Removed</em>
                      ) : message.type === 'text' ? (
                        message.text
                      ) : (
                        <Badge tone="info">{message.type}</Badge>
                      )}
                      {message.pinned && (
                        <>
                          {' '}
                          <Badge tone="warning">Pinned</Badge>
                        </>
                      )}
                    </td>
                    <td className="cell-sub">{timeAgo(message.createdAt)}</td>
                    <td className="actions">
                      {!message.deleted && (
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => void moderateMessage(message, message.pinned ? 'unpin' : 'pin')}
                          >
                            {message.pinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => void moderateMessage(message, 'delete')}
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {tab === 'announcements' && <Announcements />}
    </div>
  );
}

function Announcements() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    body: '',
    level: 'info',
    audience: 'all',
    pinned: true,
  });

  const { data, loading } = useCollection(
    'announcements',
    (d) => {
      const v = d.data();
      return {
        id: d.id,
        title: (v.title as string) ?? '',
        body: (v.body as string) ?? '',
        level: (v.level as string) ?? 'info',
        audience: (v.audience as string) ?? 'all',
        pinned: v.pinned === true,
        createdAt: ms(v.createdAt),
      };
    },
    [orderBy('createdAt', 'desc'), limit(40)],
    ['announcements'],
  );

  const publish = async () => {
    if (!draft.title.trim() || !draft.body.trim()) {
      toast.error('A title and body are required.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'announcements'), {
        ...draft,
        title: draft.title.trim(),
        body: draft.body.trim(),
        createdBy: auth.currentUser?.uid ?? 'admin',
        createdAt: serverTimestamp(),
      });
      toast.success('Announcement sent');
      setOpen(false);
      setDraft({ title: '', body: '', level: 'info', audience: 'all', pinned: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button className="btn" onClick={() => setOpen(true)}>
          + New announcement
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : data.length === 0 ? (
        <EmptyState title="No announcements" message="Broadcast a message to the community." />
      ) : (
        <div className="grid grid-2">
          {data.map((item) => (
            <div key={item.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <Badge
                  tone={item.level === 'critical' ? 'loss' : item.level === 'important' ? 'warning' : 'primary'}
                >
                  {item.level}
                </Badge>
                <span className="cell-sub">{timeAgo(item.createdAt)}</span>
              </div>
              <div style={{ fontWeight: 600, marginTop: 10 }}>{item.title}</div>
              <div className="cell-sub" style={{ marginTop: 4, lineHeight: 1.6 }}>
                {item.body}
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                <Badge>{item.audience}</Badge>
                {item.pinned && <Badge tone="warning">Pinned</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          title="New announcement"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="btn" onClick={publish} disabled={saving}>
                {saving ? 'Sending…' : 'Send announcement'}
              </button>
            </>
          }
        >
          <Field label="Title">
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </Field>
          <Field label="Message">
            <textarea className="textarea" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </Field>
          <div className="form-grid">
            <Field label="Priority">
              <select className="select" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })}>
                <option value="info">Info</option>
                <option value="important">Important</option>
                <option value="critical">Critical</option>
              </select>
            </Field>
            <Field label="Audience">
              <select className="select" value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })}>
                <option value="all">Everyone</option>
                <option value="free">Free members</option>
                <option value="premium">Premium members</option>
              </select>
            </Field>
          </div>
          <label className="checkbox">
            <input type="checkbox" checked={draft.pinned} onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })} />
            Pin to the community home screen
          </label>
          <p className="hint">Publishing sends a push notification to the selected audience.</p>
        </Modal>
      )}
    </div>
  );
}
