import React, { useMemo, useState } from 'react';
import { useCollection, orderBy, limit } from '../hooks/useCollection';
import { api } from '../lib/firebase';
import { ms, type AdminUser, type UserRole } from '../lib/types';
import { formatDate, formatDateTime, timeAgo, titleCase } from '../lib/format';
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

type Filter = 'all' | 'premium' | 'free' | 'admins' | 'restricted' | 'pending';

/**
 * User management: search, filter, and every privileged action.
 *
 * No action here writes to Firestore directly — each one calls a Cloud
 * Function, which re-checks the caller's admin claim, updates the custom claims
 * and writes the audit log entry. The dashboard cannot grant privilege on its
 * own even if this code were tampered with.
 */
export function Users() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, loading, error } = useCollection<AdminUser>(
    'users',
    (doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        fullName: d.fullName ?? '',
        username: d.username ?? '',
        email: d.email ?? '',
        photoURL: d.photoURL,
        role: d.role ?? 'user',
        plan: d.plan ?? 'free',
        status: d.status ?? 'active',
        communityStatus: d.community?.status ?? 'none',
        createdAt: ms(d.createdAt),
        lastLoginAt: ms(d.lastLoginAt) || undefined,
        planExpiresAt: ms(d.planExpiresAt) || undefined,
        platform: d.platform,
      };
    },
    [orderBy('createdAt', 'desc'), limit(500)],
    ['users-list'],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return data.filter((user) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'premium' && user.plan === 'premium') ||
        (filter === 'free' && user.plan === 'free') ||
        (filter === 'admins' && user.role !== 'user') ||
        (filter === 'restricted' && user.status !== 'active') ||
        (filter === 'pending' && user.communityStatus === 'pending');

      if (!matchesFilter) return false;
      if (!term) return true;

      return (
        user.fullName.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    });
  }, [data, filter, search]);

  const run = async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      toast.success(label);
      setSelected(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Users</h1>
      <p className="page-sub">{data.length} accounts</p>

      <div className="toolbar" style={{ marginTop: 20 }}>
        <input
          className="input"
          placeholder="Search name, username or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="select" style={{ maxWidth: 190 }} value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="all">All users</option>
          <option value="premium">Premium</option>
          <option value="free">Free</option>
          <option value="admins">Staff</option>
          <option value="restricted">Suspended / banned</option>
          <option value="pending">Pending community</option>
        </select>
        <div className="spacer" />
        <span className="hint">{filtered.length} shown</span>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No users match" message="Try a different search or filter." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Last login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.uid}>
                  <td>
                    <div className="cell-user">
                      <Avatar name={user.fullName} url={user.photoURL} />
                      <div>
                        <div className="cell-name">{user.fullName || 'Unnamed'}</div>
                        <div className="cell-sub">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-sub">{user.email}</td>
                  <td>
                    <Badge tone={user.plan === 'premium' ? 'premium' : 'neutral'}>{user.plan}</Badge>
                  </td>
                  <td>
                    <Badge tone={user.role === 'admin' ? 'primary' : user.role === 'moderator' ? 'info' : 'neutral'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={
                        user.status === 'active' ? 'profit' : user.status === 'suspended' ? 'warning' : 'loss'
                      }
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td className="cell-sub">{formatDate(user.createdAt)}</td>
                  <td className="cell-sub">{user.lastLoginAt ? timeAgo(user.lastLoginAt) : 'never'}</td>
                  <td className="actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setSelected(user)}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Modal title={selected.fullName || selected.email} onClose={() => setSelected(null)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={selected.fullName} url={selected.photoURL} />
            <div>
              <div style={{ fontWeight: 600 }}>{selected.fullName}</div>
              <div className="cell-sub">
                @{selected.username} · {selected.email}
              </div>
            </div>
          </div>

          <div className="card-flat card" style={{ display: 'grid', gap: 8 }}>
            <Row label="User ID" value={selected.uid} mono />
            <Row label="Joined" value={formatDateTime(selected.createdAt)} />
            <Row label="Last login" value={selected.lastLoginAt ? formatDateTime(selected.lastLoginAt) : 'Never'} />
            <Row label="Platform" value={selected.platform ? titleCase(selected.platform) : '—'} />
            <Row label="Community" value={titleCase(selected.communityStatus)} />
            <Row
              label="Plan expires"
              value={selected.planExpiresAt ? formatDate(selected.planExpiresAt) : '—'}
            />
          </div>

          <Field label="Subscription">
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-premium btn-sm"
                disabled={busy || selected.plan === 'premium'}
                onClick={() =>
                  run('Upgraded to Premium', () =>
                    api.setUserPlan({ uid: selected.uid, plan: 'premium' }),
                  )
                }
              >
                Upgrade to Premium
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy || selected.plan === 'free'}
                onClick={() =>
                  run('Downgraded to free', () => api.setUserPlan({ uid: selected.uid, plan: 'free' }))
                }
              >
                Downgrade to free
              </button>
            </div>
          </Field>

          <Field label="Role" hint="Admins can manage everything, including other admins.">
            <div style={{ display: 'flex', gap: 8 }}>
              {(['user', 'moderator', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  className={`btn btn-sm ${selected.role === role ? '' : 'btn-secondary'}`}
                  disabled={busy || selected.role === role}
                  onClick={() => run(`Role set to ${role}`, () => api.setUserRole({ uid: selected.uid, role }))}
                >
                  {titleCase(role)}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Community access">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm"
                disabled={busy || selected.communityStatus === 'approved'}
                onClick={() =>
                  run('Approved for the community', () =>
                    api.decideJoinRequest({ uid: selected.uid, decision: 'approve' }),
                  )
                }
              >
                Approve
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() =>
                  run('Request rejected', () =>
                    api.decideJoinRequest({ uid: selected.uid, decision: 'reject' }),
                  )
                }
              >
                Reject
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() =>
                  run('Muted for 24 hours', () =>
                    api.moderateUser({ uid: selected.uid, action: 'mute' }),
                  )
                }
              >
                Mute 24h
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy}
                onClick={() => run('Unmuted', () => api.moderateUser({ uid: selected.uid, action: 'unmute' }))}
              >
                Unmute
              </button>
              <button
                className="btn btn-danger btn-sm"
                disabled={busy}
                onClick={() =>
                  run('Removed from the community', () =>
                    api.moderateUser({ uid: selected.uid, action: 'remove_from_community' }),
                  )
                }
              >
                Remove from community
              </button>
            </div>
          </Field>

          <Field label="Account status">
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-sm"
                disabled={busy || selected.status === 'active'}
                onClick={() => run('Account reactivated', () => api.moderateUser({ uid: selected.uid, action: 'activate' }))}
              >
                Activate
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={busy || selected.status === 'suspended'}
                onClick={() => run('Account suspended', () => api.moderateUser({ uid: selected.uid, action: 'suspend' }))}
              >
                Suspend
              </button>
              <button
                className="btn btn-danger btn-sm"
                disabled={busy || selected.status === 'banned'}
                onClick={() => run('Account banned', () => api.moderateUser({ uid: selected.uid, action: 'ban' }))}
              >
                Ban
              </button>
            </div>
          </Field>
        </Modal>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span className="cell-sub">{label}</span>
      <span className={mono ? 'mono' : undefined} style={{ fontSize: 13 }}>
        {value}
      </span>
    </div>
  );
}
