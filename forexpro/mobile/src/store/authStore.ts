import { create } from 'zustand';
import type { User } from '@react-native-firebase/auth';
import type { AppUser, Subscription } from '../types/models';
import { type AuthClaims, emptyClaims, observeAuth, readClaims } from '../services/firebase/authService';
import { observeUser, observeSubscription, touchLogin } from '../services/firebase/userRepo';
import { identify } from '../services/analytics';
import { log } from '../utils/logger';
import { DEMO_MODE } from '../config/demo';
import { DEMO_UID } from '../services/demo/db';
import {
  observeUser as demoObserveUser,
  observeSubscription as demoObserveSubscription,
} from '../services/demo/repos';

/**
 * Session state.
 *
 * One store owns the whole authenticated session: the Firebase user, the
 * profile document, the server-issued claims and the subscription mirror.
 * Screens read derived booleans (`isPremium`, `isAdmin`, `canPostInCommunity`)
 * rather than re-deriving the rules themselves.
 *
 * Authorization always comes from `claims`, which only a Cloud Function can
 * mint. The `profile` fields of the same name are display copies and must never
 * be used to gate access.
 */

type AuthState = {
  /** False until the first auth callback arrives — drives the splash screen. */
  initialized: boolean;
  firebaseUser: User | null;
  profile: AppUser | null;
  claims: AuthClaims;
  subscription: Subscription | null;
  profileLoading: boolean;
  profileError: string | null;

  start: () => () => void;
  refreshClaims: () => Promise<void>;
  reset: () => void;
};

let unsubscribeUser: (() => void) | null = null;
let unsubscribeSubscription: (() => void) | null = null;

function detachUserListeners() {
  unsubscribeUser?.();
  unsubscribeSubscription?.();
  unsubscribeUser = null;
  unsubscribeSubscription = null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  initialized: false,
  firebaseUser: null,
  profile: null,
  claims: emptyClaims,
  subscription: null,
  profileLoading: false,
  profileError: null,

  /**
   * Begins observing authentication. Returns a teardown function; call it once
   * from the root layout.
   */
  start: () => {
    // Demo mode never touches Firebase Auth: the session is synthesised from
    // the in-memory store, and the claims follow the demo user's plan so every
    // free/premium gate in the app behaves exactly as it would in production.
    if (DEMO_MODE) {
      const unsubscribeUser = demoObserveUser('demo', (profile) => {
        set({
          initialized: true,
          firebaseUser: { uid: profile?.uid ?? DEMO_UID } as unknown as User,
          profile,
          claims: {
            admin: false,
            moderator: false,
            plan: profile?.plan ?? 'free',
            community: profile?.community.status ?? 'approved',
            status: profile?.status ?? 'active',
          },
          profileLoading: false,
          profileError: null,
        });
      });
      const unsubscribeSub = demoObserveSubscription('demo', (subscription) =>
        set({ subscription }),
      );
      return () => {
        unsubscribeUser();
        unsubscribeSub();
      };
    }

    const unsubscribeAuth = observeAuth(async (user) => {
      detachUserListeners();

      if (!user) {
        set({
          initialized: true,
          firebaseUser: null,
          profile: null,
          claims: emptyClaims,
          subscription: null,
          profileLoading: false,
          profileError: null,
        });
        log.setUser(null);
        void identify(null);
        return;
      }

      set({ firebaseUser: user, profileLoading: true, profileError: null });
      log.setUser(user.uid);

      const claims = await readClaims(true);
      set({ claims });

      unsubscribeUser = observeUser(
        user.uid,
        (profile) => {
          set({ profile, profileLoading: false, initialized: true });
          if (profile) {
            void identify(profile.uid, profile.plan, profile.role);
            log.setContext('plan', profile.plan);
          }
        },
        (err) => {
          log.error('user profile listener failed', err);
          set({
            profileLoading: false,
            initialized: true,
            profileError: 'We could not load your profile. Pull to retry.',
          });
        },
      );

      unsubscribeSubscription = observeSubscription(user.uid, (subscription) => {
        set({ subscription });
      });

      void touchLogin(user.uid);
    });

    return () => {
      unsubscribeAuth();
      detachUserListeners();
    };
  },

  /** Re-reads claims after a plan change, role change or moderation action. */
  refreshClaims: async () => {
    if (DEMO_MODE) return;
    if (!get().firebaseUser) return;
    const claims = await readClaims(true);
    set({ claims });
  },

  reset: () => {
    detachUserListeners();
    set({
      firebaseUser: null,
      profile: null,
      claims: emptyClaims,
      subscription: null,
      profileLoading: false,
      profileError: null,
    });
  },
}));

// ------------------------------------------------------------------ selectors

export const useIsSignedIn = () => useAuthStore((s) => s.firebaseUser !== null);
export const useProfile = () => useAuthStore((s) => s.profile);
export const useClaims = () => useAuthStore((s) => s.claims);

/** Authoritative premium check — reads the claim, never the profile field. */
export const useIsPremium = () => useAuthStore((s) => s.claims.plan === 'premium');
export const useIsAdmin = () => useAuthStore((s) => s.claims.admin);
export const useIsModerator = () => useAuthStore((s) => s.claims.moderator);

export const useCommunityStatus = () => useAuthStore((s) => s.claims.community);

export const useCanPostInCommunity = () =>
  useAuthStore((s) => {
    if (s.claims.admin) return true;
    if (s.claims.community !== 'approved') return false;
    if (s.claims.status !== 'active') return false;
    const mutedUntil = s.profile?.community.mutedUntil;
    return !mutedUntil || mutedUntil < Date.now();
  });

/** Non-hook access, for use inside services and event handlers. */
export const authSnapshot = () => useAuthStore.getState();
