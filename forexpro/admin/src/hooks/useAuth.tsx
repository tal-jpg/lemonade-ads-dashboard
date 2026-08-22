import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

/**
 * Admin session.
 *
 * Access is decided by the `admin` custom claim, read from the ID token. A user
 * who signs in without it is shown a refusal and signed out — and even if that
 * check were bypassed in the browser, every read and write behind it is
 * rejected by security rules.
 */

type AuthState = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (next) => {
      if (!next) {
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      const token = await next.getIdTokenResult(true);
      const admin = token.claims.admin === true;
      setUser(next);
      setIsAdmin(admin);
      setLoading(false);
      if (!admin) {
        setError('This account does not have administrator access.');
        await fbSignOut(auth);
      }
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setError(
        code === 'auth/invalid-credential' || code === 'auth/wrong-password'
          ? 'Incorrect email or password.'
          : code === 'auth/too-many-requests'
            ? 'Too many attempts. Please wait and try again.'
            : 'Could not sign in. Please try again.',
      );
      throw err;
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
