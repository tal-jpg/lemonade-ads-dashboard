import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  onAuthStateChanged,
  getIdTokenResult,
  deleteUser,
  type User,
  type UserCredential,
} from '@react-native-firebase/auth';
import { EmailAuthProvider } from '@react-native-firebase/auth';
import { writeBatch, serverTimestamp, getDoc } from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import { auth, db, appVersion } from './client';
import { refs } from './paths';
import { defaultNotificationPrefs } from '../../types/models';
import { serviceError } from '../../utils/errors';
import { normalisePhone, normaliseUsername } from '../../utils/validate';
import { log } from '../../utils/logger';

/**
 * Authentication.
 *
 * Registration is a two-part operation: the Firebase Auth account, then an
 * atomic batch that claims the username and creates the profile. If the batch
 * fails (almost always "username taken"), the orphaned auth account is removed
 * so the user can retry cleanly with the same email.
 *
 * Privileged fields (role, plan, status, community) are written with safe
 * defaults here and are immutable to clients thereafter — a Cloud Function
 * mints the matching custom claims on account creation.
 */

export type RegisterInput = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  phone: string;
};

export type AuthClaims = {
  admin: boolean;
  moderator: boolean;
  plan: 'free' | 'premium';
  community: 'none' | 'pending' | 'approved' | 'rejected' | 'blocked';
  status: 'active' | 'suspended' | 'banned';
};

export const emptyClaims: AuthClaims = {
  admin: false,
  moderator: false,
  plan: 'free',
  community: 'none',
  status: 'active',
};

export function observeAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth(), cb);
}

/** True when the username is not yet claimed. */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const clean = normaliseUsername(username);
  if (!clean) return false;
  try {
    const snap = await getDoc(refs.username(clean));
    return !snap.exists();
  } catch (err) {
    log.error('username availability check failed', err);
    // Fail open — the batch write is the real gate.
    return true;
  }
}

export async function register(input: RegisterInput): Promise<User> {
  const username = normaliseUsername(input.username);
  const email = input.email.trim().toLowerCase();
  const phone = normalisePhone(input.phone);

  let credential: UserCredential;
  try {
    credential = await createUserWithEmailAndPassword(auth(), email, input.password);
  } catch (err) {
    throw serviceError(err, 'Could not create your account. Please try again.');
  }

  const user = credential.user;

  try {
    await updateProfile(user, { displayName: input.fullName.trim() });

    const batch = writeBatch(db());

    // Creating the username document fails if it already exists, which makes
    // the whole batch atomic against a race for the same handle.
    batch.set(refs.username(username), { uid: user.uid, createdAt: serverTimestamp() });

    batch.set(refs.user(user.uid), {
      uid: user.uid,
      fullName: input.fullName.trim(),
      username,
      usernameLower: username,
      email,
      photoURL: '',
      bio: '',
      role: 'user',
      plan: 'free',
      status: 'active',
      community: { status: 'none' },
      notificationPrefs: defaultNotificationPrefs,
      themePreference: 'dark',
      onboardingCompleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion,
      stats: { lessonsCompleted: 0, messagesSent: 0 },
    });

    // Contact details live in a subcollection only the owner and staff can read.
    batch.set(refs.userPrivate(user.uid), {
      phone,
      email,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    // Roll back the auth account so the email is not left unusable.
    try {
      await deleteUser(user);
    } catch (cleanupErr) {
      log.error('failed to roll back orphaned auth account', cleanupErr);
    }
    throw serviceError(err, 'That username is already taken. Please choose another.');
  }

  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(
      auth(),
      email.trim().toLowerCase(),
      password,
    );
    return credential.user;
  } catch (err) {
    throw serviceError(err, 'Could not sign you in. Please check your details.');
  }
}

export async function signOut(): Promise<void> {
  try {
    await fbSignOut(auth());
  } catch (err) {
    throw serviceError(err, 'Could not sign out. Please try again.');
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth(), email.trim().toLowerCase());
  } catch (err) {
    throw serviceError(err, 'Could not send the reset email. Please try again.');
  }
}

/**
 * Re-authenticates then changes the password. Firebase requires a recent login
 * for this, so the current password is always required.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth().currentUser;
  if (!user?.email) throw serviceError({ code: 'unauthenticated' }, 'Please sign in again.');

  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  } catch (err) {
    throw serviceError(err, 'Could not change your password. Check your current password.');
  }
}

/** Re-authenticates the caller — required before destructive account actions. */
export async function reauthenticate(password: string): Promise<void> {
  const user = auth().currentUser;
  if (!user?.email) throw serviceError({ code: 'unauthenticated' }, 'Please sign in again.');
  try {
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
  } catch (err) {
    throw serviceError(err, 'Incorrect password.');
  }
}

/**
 * Reads the custom claims that drive every authorization decision.
 * `force` bypasses the cached token — call it after a plan or role change.
 */
export async function readClaims(force = false): Promise<AuthClaims> {
  const user = auth().currentUser;
  if (!user) return emptyClaims;
  try {
    const result = await getIdTokenResult(user, force);
    const c = result.claims as Record<string, unknown>;
    return {
      admin: c.admin === true,
      moderator: c.moderator === true || c.admin === true,
      plan: c.plan === 'premium' ? 'premium' : 'free',
      community:
        c.community === 'approved' ||
        c.community === 'pending' ||
        c.community === 'rejected' ||
        c.community === 'blocked'
          ? c.community
          : 'none',
      status:
        c.status === 'suspended' || c.status === 'banned'
          ? (c.status as 'suspended' | 'banned')
          : 'active',
    };
  } catch (err) {
    log.error('failed to read auth claims', err);
    return emptyClaims;
  }
}

export function currentUser(): User | null {
  return auth().currentUser;
}
