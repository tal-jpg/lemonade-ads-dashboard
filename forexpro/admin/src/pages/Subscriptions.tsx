import React, { useMemo } from 'react';
import { useCollection, orderBy, limit } from '../hooks/useCollection';
import { ms, type AdminSubscription } from '../lib/types';
import { formatDate, titleCase } from '../lib/format';
import { Badge, EmptyState, StatCard, TableSkeleton } from '../components/ui';

/**
 * Subscription ledger.
 *
 * Read-only by design: every row here was written by a verified store
 * transaction or by an explicit manual override on the Users page. Editing
 * entitlement from a table is exactly how billing state drifts from reality.
 */
export function Subscriptions() {
  const { data, loading } = useCollection<AdminSubscription>(
    'subscriptions',
    (d) => {
      const v = d.data();
      return {
        uid: d.id,
        plan: v.plan ?? 'free',
        status: v.status ?? 'expired',
        productId: v.productId,
        store: v.store,
        expiresAt: ms(v.expiresAt) || undefined,
        autoRenewing: v.autoRenewing === true,
      };
    },
    [orderBy('lastVerifiedAt', 'desc'), limit(300)],
    ['subscriptions'],
  );

  const metrics = useMemo(() => {
    const active = data.filter((s) => s.status === 'active');
    const expiringSoon = active.filter(
      (s) => s.expiresAt && s.expiresAt < Date.now() + 7 * 86_400_000,
    );
    return {
      active: active.length,
      grace: data.filter((s) => s.status === 'in_grace').length,
      cancelled: data.filter((s) => s.status === 'cancelled').length,
      expiringSoon: expiringSoon.length,
      apple: data.filter((s) => s.store === 'apple').length,
      google: data.filter((s) => s.store === 'google').length,
      manual: data.filter((s) => s.store === 'manual').length,
    };
  }, [data]);

  return (
    <div>
      <h1 className="page-title">Subscriptions</h1>
      <p className="page-sub">Verified store entitlements</p>

      <div className="grid grid-4" style={{ marginTop: 20 }}>
        <StatCard label="Active" value={metrics.active} tone="profit" />
        <StatCard label="In grace period" value={metrics.grace} tone={metrics.grace > 0 ? 'warning' : undefined} />
        <StatCard label="Cancelled" value={metrics.cancelled} hint="Access until expiry" />
        <StatCard label="Expiring in 7 days" value={metrics.expiringSoon} tone={metrics.expiringSoon > 0 ? 'warning' : undefined} />
      </div>

      <div className="grid grid-4" style={{ marginTop: 14 }}>
        <StatCard label="Apple" value={metrics.apple} />
        <StatCard label="Google Play" value={metrics.google} />
        <StatCard label="Manual / comped" value={metrics.manual} />
        <StatCard label="Total records" value={data.length} />
      </div>

      <div style={{ marginTop: 20 }}>
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : data.length === 0 ? (
          <EmptyState
            title="No subscriptions yet"
            message="Records appear here once a purchase is verified."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Store</th>
                  <th>Product</th>
                  <th>Renews / expires</th>
                  <th>Auto-renew</th>
                </tr>
              </thead>
              <tbody>
                {data.map((sub) => (
                  <tr key={sub.uid}>
                    <td className="mono cell-sub">{sub.uid}</td>
                    <td>
                      <Badge tone={sub.plan === 'premium' ? 'premium' : 'neutral'}>{sub.plan}</Badge>
                    </td>
                    <td>
                      <Badge
                        tone={
                          sub.status === 'active'
                            ? 'profit'
                            : sub.status === 'in_grace' || sub.status === 'cancelled'
                              ? 'warning'
                              : 'loss'
                        }
                      >
                        {titleCase(sub.status)}
                      </Badge>
                    </td>
                    <td className="cell-sub">{sub.store ? titleCase(sub.store) : '—'}</td>
                    <td className="mono cell-sub">{sub.productId ?? '—'}</td>
                    <td className="cell-sub">{formatDate(sub.expiresAt)}</td>
                    <td>
                      <Badge tone={sub.autoRenewing ? 'primary' : 'neutral'}>
                        {sub.autoRenewing ? 'On' : 'Off'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="hint" style={{ marginTop: 16 }}>
        To change a plan manually, use the Users page. Manual overrides are recorded in the audit
        log and are marked with the "manual" store so they can be told apart from store purchases.
      </p>
    </div>
  );
}
