import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCollection, orderBy, limit, where } from '../hooks/useCollection';
import { StatCard, Badge, EmptyState, TableSkeleton, Avatar } from '../components/ui';
import { ms, type AdminUser, type AdminSignal, type DailyStats } from '../lib/types';
import { formatPair, timeAgo } from '../lib/format';

/**
 * Overview.
 *
 * Counts come from live listeners on bounded queries — the dashboard never
 * reads the full users collection to compute a number.
 */
export function Dashboard() {
  const { data: users, loading: usersLoading } = useCollection<AdminUser>(
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
      };
    },
    [orderBy('createdAt', 'desc'), limit(500)],
    ['dashboard-users'],
  );

  const { data: signals } = useCollection<AdminSignal>(
    'signals',
    (doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        pair: d.pair ?? '',
        direction: d.direction ?? 'buy',
        entry: d.entry ?? 0,
        stopLoss: d.stopLoss ?? 0,
        takeProfits: d.takeProfits ?? [],
        riskReward: d.riskReward,
        timeframe: d.timeframe ?? '',
        confidence: d.confidence ?? 'medium',
        status: d.status ?? 'published',
        tradeState: d.tradeState ?? 'pending',
        result: d.result,
        pips: d.pips,
        isPremium: d.isPremium === true,
        authorName: d.authorName ?? '',
        publishedAt: ms(d.publishedAt),
      };
    },
    [orderBy('publishedAt', 'desc'), limit(60)],
    ['dashboard-signals'],
  );

  const { data: stats } = useCollection<DailyStats>(
    'daily_stats',
    (doc) => {
      const d = doc.data();
      return {
        day: doc.id,
        signals: d.signals ?? 0,
        wins: d.wins ?? 0,
        losses: d.losses ?? 0,
        winRate: d.winRate ?? 0,
        avgRR: d.avgRR ?? 0,
      };
    },
    [orderBy('__name__', 'desc'), limit(14)],
    ['dashboard-stats'],
  );

  const { data: pendingRequests } = useCollection(
    'join_requests',
    (doc) => ({ uid: doc.id, ...(doc.data() as Record<string, unknown>) }),
    [where('status', '==', 'pending')],
    ['dashboard-pending'],
  );

  const metrics = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0);

    return {
      total: users.length,
      premium: users.filter((u) => u.plan === 'premium').length,
      free: users.filter((u) => u.plan === 'free').length,
      active24h: users.filter((u) => (u.lastLoginAt ?? 0) > dayAgo).length,
      newThisWeek: users.filter((u) => u.createdAt > weekAgo).length,
      suspended: users.filter((u) => u.status !== 'active').length,
      openSignals: signals.filter(
        (s) => s.tradeState === 'active' || s.tradeState === 'pending',
      ).length,
      signalsToday: signals.filter((s) => s.publishedAt >= todayStart).length,
      community: users.filter((u) => u.communityStatus === 'approved').length,
    };
  }, [users, signals]);

  const growth = useMemo(() => {
    // Registrations per day over the last two weeks.
    const buckets = new Map<string, number>();
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      buckets.set(date.toISOString().slice(5, 10), 0);
    }
    users.forEach((u) => {
      const key = new Date(u.createdAt).toISOString().slice(5, 10);
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets, ([day, count]) => ({ day, count }));
  }, [users]);

  const performance = useMemo(
    () =>
      [...stats]
        .sort((a, b) => a.day.localeCompare(b.day))
        .map((s) => ({ day: s.day.slice(5), wins: s.wins, losses: s.losses, winRate: s.winRate })),
    [stats],
  );

  return (
    <div>
      <h1 className="page-title">Overview</h1>
      <p className="page-sub">Live snapshot of the platform.</p>

      <div className="grid grid-4" style={{ marginTop: 20 }}>
        <StatCard label="Total users" value={metrics.total} hint={`${metrics.newThisWeek} new this week`} />
        <StatCard label="Premium" value={metrics.premium} tone="premium" hint={`${metrics.free} on free`} />
        <StatCard label="Active (24h)" value={metrics.active24h} tone="primary" />
        <StatCard label="Community members" value={metrics.community} hint={`${pendingRequests.length} pending`} tone={pendingRequests.length > 0 ? 'warning' : undefined} />
      </div>

      <div className="grid grid-4" style={{ marginTop: 14 }}>
        <StatCard label="Signals today" value={metrics.signalsToday} />
        <StatCard label="Open trades" value={metrics.openSignals} tone="info" />
        <StatCard label="Win rate (today)" value={`${stats[0]?.winRate ?? 0}%`} tone="profit" hint="Historical — not a forecast" />
        <StatCard label="Restricted accounts" value={metrics.suspended} tone={metrics.suspended > 0 ? 'loss' : undefined} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h2 className="card-title">Registrations · last 14 days</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growth} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2AD679" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2AD679" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1B2F23" vertical={false} />
              <XAxis dataKey="day" stroke="#66816F" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#66816F" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: '#1D3527',
                  border: '1px solid #2E4A39',
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: '#9DB4A6' }}
              />
              <Area type="monotone" dataKey="count" stroke="#2AD679" strokeWidth={2} fill="url(#growthFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="card-title">Signal results · last 14 days</h2>
          {performance.length === 0 ? (
            <EmptyState title="No results yet" message="Daily rollups appear once trades close." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={performance} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#1B2F23" vertical={false} />
                <XAxis dataKey="day" stroke="#66816F" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#66816F" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1D3527',
                    border: '1px solid #2E4A39',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="wins" stackId="r" fill="#2AD679" radius={[0, 0, 0, 0]} />
                <Bar dataKey="losses" stackId="r" fill="#F6465D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <h2 className="card-title">Recent registrations</h2>
          {usersLoading ? (
            <TableSkeleton rows={4} cols={2} />
          ) : users.length === 0 ? (
            <EmptyState title="No users yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {users.slice(0, 6).map((user) => (
                <div key={user.uid} className="cell-user">
                  <Avatar name={user.fullName} url={user.photoURL} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cell-name">{user.fullName || 'Unnamed'}</div>
                    <div className="cell-sub">@{user.username}</div>
                  </div>
                  <Badge tone={user.plan === 'premium' ? 'premium' : 'neutral'}>{user.plan}</Badge>
                  <span className="cell-sub">{timeAgo(user.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Latest signals</h2>
          {signals.length === 0 ? (
            <EmptyState title="No signals published" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {signals.slice(0, 6).map((signal) => (
                <div key={signal.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Badge tone={signal.direction === 'buy' ? 'profit' : 'loss'}>
                    {signal.direction}
                  </Badge>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="cell-name mono">{formatPair(signal.pair)}</div>
                    <div className="cell-sub">
                      {signal.timeframe} · {timeAgo(signal.publishedAt)}
                    </div>
                  </div>
                  {signal.isPremium && <Badge tone="premium">Premium</Badge>}
                  <Badge
                    tone={
                      signal.tradeState === 'tp_hit'
                        ? 'profit'
                        : signal.tradeState === 'sl_hit'
                          ? 'loss'
                          : signal.tradeState === 'active'
                            ? 'info'
                            : 'neutral'
                    }
                  >
                    {signal.tradeState.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
