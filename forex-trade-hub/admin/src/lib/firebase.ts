import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';

/**
 * Firebase for the admin dashboard.
 *
 * The web config below is public by design. What actually gates this dashboard
 * is the `admin` custom claim: security rules reject every privileged read and
 * write without it, so knowing the project id buys an attacker nothing.
 */

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

if (import.meta.env.VITE_USE_EMULATOR === '1') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

/** Typed wrapper over the callables the dashboard is allowed to invoke. */
export function callable<TRequest extends object, TResponse>(name: string) {
  const fn = httpsCallable<TRequest, TResponse>(functions, name);
  return async (payload: TRequest): Promise<TResponse> => (await fn(payload)).data;
}

export const api = {
  setUserRole: callable<{ uid: string; role: 'user' | 'moderator' | 'admin' }, { ok: true }>(
    'setUserRole',
  ),
  setUserPlan: callable<{ uid: string; plan: 'free' | 'premium'; expiresAt?: number }, { ok: true }>(
    'setUserPlan',
  ),
  moderateUser: callable<
    {
      uid: string;
      action: 'suspend' | 'ban' | 'activate' | 'mute' | 'unmute' | 'remove_from_community';
      until?: number;
      reason?: string;
    },
    { ok: true }
  >('moderateUser'),
  decideJoinRequest: callable<
    { uid: string; decision: 'approve' | 'reject' | 'block' },
    { ok: true }
  >('decideJoinRequest'),
};
