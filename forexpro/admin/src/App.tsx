import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Signals } from './pages/Signals';
import { News } from './pages/News';
import { Courses } from './pages/Courses';
import { Community } from './pages/Community';
import { Polls } from './pages/Polls';
import { Subscriptions } from './pages/Subscriptions';
import { Settings } from './pages/Settings';

/**
 * Route table.
 *
 * Everything except /login sits behind the admin guard. The guard is a
 * convenience — the real enforcement is the security rules, which reject the
 * underlying reads without the admin claim regardless of what renders.
 */
function Guarded({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="state" style={{ paddingTop: 120 }}>
        <div className="state-title">Loading…</div>
      </div>
    );
  }
  if (!user || !isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <Guarded>
                  <Layout />
                </Guarded>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="users" element={<Users />} />
              <Route path="signals" element={<Signals />} />
              <Route path="news" element={<News />} />
              <Route path="courses" element={<Courses />} />
              <Route path="community" element={<Community />} />
              <Route path="polls" element={<Polls />} />
              <Route path="subscriptions" element={<Subscriptions />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
