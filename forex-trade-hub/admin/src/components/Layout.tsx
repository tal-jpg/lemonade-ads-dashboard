import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCollection, orderBy, where } from '../hooks/useCollection';
import { Avatar } from './ui';

/**
 * Dashboard chrome: sidebar navigation, top bar and the routed outlet.
 * The Community link carries a live count of pending join requests, because
 * that is the one queue that needs a human within minutes.
 */

const NAV = [
  { to: '/', label: 'Overview', icon: '◲', end: true },
  { to: '/users', label: 'Users', icon: '☰' },
  { to: '/signals', label: 'Signals', icon: '⇅' },
  { to: '/news', label: 'News', icon: '❏' },
  { to: '/courses', label: 'Education', icon: '✦' },
  { to: '/community', label: 'Community', icon: '◍' },
  { to: '/polls', label: 'Polls', icon: '▤' },
  { to: '/subscriptions', label: 'Subscriptions', icon: '◈' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const { data: pending } = useCollection(
    'join_requests',
    (doc) => doc.id,
    [where('status', '==', 'pending'), orderBy('createdAt', 'desc')],
    ['pending-requests'],
  );

  return (
    <div className="shell">
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">FTH</div>
          <div>
            <div className="brand-name">Forex Trade Hub</div>
            <div className="brand-sub">Admin</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
              {item.to === '/community' && pending.length > 0 && (
                <span className="nav-badge">{pending.length}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 12px' }}>
            <Avatar name={user?.displayName ?? user?.email ?? 'Admin'} url={user?.photoURL ?? undefined} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.displayName ?? 'Administrator'}
              </div>
              <div className="cell-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setOpen((v) => !v)}
            style={{ display: 'none' }}
            aria-label="Toggle navigation"
          >
            ☰
          </button>
          <strong style={{ fontSize: 14 }}>
            {NAV.find((n) => (n.end ? n.to === location.pathname : location.pathname.startsWith(n.to)))
              ?.label ?? 'Admin'}
          </strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-primary">Live</span>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
