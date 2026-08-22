import {
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  increment,
} from '@react-native-firebase/firestore';
import { refs } from './paths';
import { mapUser, mapSubscription, mapProgress } from './mappers';
import type {
  AppUser,
  LessonProgress,
  NotificationPrefs,
  Subscription,
  ThemePreference,
  UserAddress,
} from '../../types/models';
import { serviceError } from '../../utils/errors';
import { appVersion } from './client';
import { Platform } from 'react-native';
import { DEMO_MODE } from '../../config/demo';
import * as demo from '../demo/repos';

/**
 * User profile, subscription mirror and lesson progress.
 */

export function observeUser(
  uid: string,
  onData: (user: AppUser | null) => void,
  onError: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeUser(uid, onData);
  return onSnapshot(
    refs.user(uid),
    (snap) => onData(mapUser(snap)),
    (err) => onError(err),
  );
}

export async function fetchUser(uid: string): Promise<AppUser | null> {
  if (DEMO_MODE) return demo.fetchUser();
  try {
    return mapUser(await getDoc(refs.user(uid)));
  } catch (err) {
    throw serviceError(err, 'Could not load your profile.');
  }
}

export type ProfileUpdate = {
  fullName?: string;
  bio?: string;
  photoURL?: string;
  address?: UserAddress;
};

export async function updateProfileFields(uid: string, update: ProfileUpdate): Promise<void> {
  if (DEMO_MODE) return demo.updateProfileFields(uid, update);
  try {
    await updateDoc(refs.user(uid), { ...update, updatedAt: serverTimestamp() });
  } catch (err) {
    throw serviceError(err, 'Could not save your profile.');
  }
}

/** Phone lives in the owner-only private subcollection. */
export async function updatePhone(uid: string, phone: string): Promise<void> {
  if (DEMO_MODE) return demo.updatePhone(uid, phone);
  try {
    await setDoc(refs.userPrivate(uid), { phone, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    throw serviceError(err, 'Could not save your phone number.');
  }
}

export async function fetchPhone(uid: string): Promise<string> {
  if (DEMO_MODE) return demo.fetchPhone();
  try {
    const snap = await getDoc(refs.userPrivate(uid));
    const data = snap.data();
    return typeof data?.phone === 'string' ? data.phone : '';
  } catch {
    return '';
  }
}

export async function updateNotificationPrefs(
  uid: string,
  prefs: NotificationPrefs,
): Promise<void> {
  if (DEMO_MODE) return demo.updateNotificationPrefs(uid, prefs);
  try {
    await updateDoc(refs.user(uid), { notificationPrefs: prefs, updatedAt: serverTimestamp() });
  } catch (err) {
    throw serviceError(err, 'Could not save your notification settings.');
  }
}

export async function updateThemePreference(uid: string, theme: ThemePreference): Promise<void> {
  if (DEMO_MODE) return demo.updateThemePreference(uid, theme);
  try {
    await updateDoc(refs.user(uid), { themePreference: theme, updatedAt: serverTimestamp() });
  } catch {
    // Theme is a local-first preference; a failed sync is not worth an error.
  }
}

export async function markOnboardingComplete(uid: string): Promise<void> {
  if (DEMO_MODE) return demo.markOnboardingComplete();
  try {
    await updateDoc(refs.user(uid), { onboardingCompleted: true, updatedAt: serverTimestamp() });
  } catch {
    // Non-critical.
  }
}

/** Stamps the login and the device/app metadata used by the admin dashboard. */
export async function touchLogin(uid: string): Promise<void> {
  if (DEMO_MODE) return demo.touchLogin();
  try {
    await updateDoc(refs.user(uid), {
      lastLoginAt: serverTimestamp(),
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Best effort.
  }
}

// ------------------------------------------------------------- subscription

export function observeSubscription(
  uid: string,
  onData: (sub: Subscription | null) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeSubscription(uid, onData);
  return onSnapshot(
    refs.subscription(uid),
    (snap) => onData(mapSubscription(snap)),
    (err) => onError?.(err),
  );
}

// ---------------------------------------------------------------- progress

export function observeProgress(
  uid: string,
  onData: (progress: Record<string, LessonProgress>) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeProgress(uid, onData);
  return onSnapshot(
    refs.progress(uid),
    (snap) => {
      const map: Record<string, LessonProgress> = {};
      snap.forEach((doc) => {
        const p = mapProgress(doc);
        if (p) map[p.lessonId] = p;
      });
      onData(map);
    },
    (err) => onError?.(err),
  );
}

export async function fetchCourseProgress(
  uid: string,
  courseId: string,
): Promise<LessonProgress[]> {
  if (DEMO_MODE) return demo.fetchCourseProgress(uid, courseId);
  try {
    const snap = await getDocs(query(refs.progress(uid), where('courseId', '==', courseId)));
    return snap.docs.map(mapProgress).filter((p): p is LessonProgress => p !== null);
  } catch (err) {
    throw serviceError(err, 'Could not load your progress.');
  }
}

export async function markLessonComplete(
  uid: string,
  courseId: string,
  lessonId: string,
  score?: number,
): Promise<void> {
  if (DEMO_MODE) return demo.markLessonComplete(uid, courseId, lessonId, score);
  try {
    await setDoc(
      refs.progressItem(uid, lessonId),
      {
        courseId,
        completed: true,
        completedAt: serverTimestamp(),
        ...(score !== undefined ? { score } : {}),
      },
      { merge: true },
    );
    await updateDoc(refs.user(uid), { 'stats.lessonsCompleted': increment(1) }).catch(() => {
      // The counter is cosmetic; progress itself is already saved.
    });
  } catch (err) {
    throw serviceError(err, 'Could not save your progress.');
  }
}
