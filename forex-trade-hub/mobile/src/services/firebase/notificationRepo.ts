import {
  onSnapshot,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { db } from './client';
import { refs } from './paths';
import { mapNotification, mapAnnouncement } from './mappers';
import type { AppNotification, Announcement, PlanId } from '../../types/models';
import { serviceError } from '../../utils/errors';
import { DEMO_MODE } from '../../config/demo';
import * as demo from '../demo/repos';

/**
 * In-app notification centre and announcements.
 *
 * Documents are fanned out server-side (see functions/src/notifications.ts);
 * the client only reads, marks read, and deletes.
 */

export function observeNotifications(
  uid: string,
  count: number,
  onData: (items: AppNotification[]) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeNotifications(uid, count, onData);
  const q = query(refs.notifications(uid), orderBy('createdAt', 'desc'), limit(count));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(mapNotification).filter((n): n is AppNotification => n !== null)),
    (err) => onError?.(err),
  );
}

/** Unread badge count. Capped — past 99 the exact number does not matter. */
export function observeUnreadCount(
  uid: string,
  onData: (count: number) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeUnreadCount(uid, onData);
  const q = query(refs.notifications(uid), where('read', '==', false), limit(99));
  return onSnapshot(
    q,
    (snap) => onData(snap.size),
    (err) => onError?.(err),
  );
}

export async function markRead(uid: string, id: string): Promise<void> {
  if (DEMO_MODE) return demo.markRead(uid, id);
  try {
    await updateDoc(refs.notification(uid, id), { read: true, readAt: serverTimestamp() });
  } catch (err) {
    throw serviceError(err, 'Could not update the notification.');
  }
}

export async function markAllRead(uid: string): Promise<void> {
  if (DEMO_MODE) return demo.markAllRead();
  try {
    const snap = await getDocs(query(refs.notifications(uid), where('read', '==', false), limit(400)));
    if (snap.empty) return;
    const batch = writeBatch(db());
    snap.docs.forEach((d) => batch.update(d.ref, { read: true, readAt: serverTimestamp() }));
    await batch.commit();
  } catch (err) {
    throw serviceError(err, 'Could not mark everything as read.');
  }
}

export async function deleteNotification(uid: string, id: string): Promise<void> {
  if (DEMO_MODE) return demo.deleteNotification(uid, id);
  try {
    await deleteDoc(refs.notification(uid, id));
  } catch (err) {
    throw serviceError(err, 'Could not delete the notification.');
  }
}

// ------------------------------------------------------------ announcements

export function observeAnnouncements(
  plan: PlanId,
  count: number,
  onData: (items: Announcement[]) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeAnnouncements(plan, count, onData);
  // `in` keeps this to a single query: everyone sees "all", plus their tier.
  const q = query(
    refs.announcements(),
    where('audience', 'in', ['all', plan]),
    orderBy('createdAt', 'desc'),
    limit(count),
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(mapAnnouncement).filter((a): a is Announcement => a !== null)),
    (err) => onError?.(err),
  );
}
