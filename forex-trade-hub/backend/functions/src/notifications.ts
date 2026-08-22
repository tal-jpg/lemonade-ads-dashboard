import { logger } from 'firebase-functions';
import { db, messaging, FieldValue } from './common';

/**
 * Notification fan-out.
 *
 * Broadcasts go to FCM topics (`all`, `free`, `premium`) so a signal reaches
 * thousands of devices in one API call. Per-user notifications go to that
 * user's registered tokens. Both paths also write an in-app notification
 * document so the notification centre matches what was pushed.
 */

export type NotificationType =
  | 'new_signal'
  | 'premium_signal'
  | 'signal_update'
  | 'news'
  | 'lesson'
  | 'poll'
  | 'community'
  | 'announcement'
  | 'subscription'
  | 'join_request';

/** Maps a notification type to the Android channel it should use. */
const CHANNEL: Record<NotificationType, string> = {
  new_signal: 'signals',
  premium_signal: 'signals',
  signal_update: 'signals',
  news: 'content',
  lesson: 'content',
  poll: 'community',
  community: 'community',
  announcement: 'community',
  subscription: 'account',
  join_request: 'account',
};

/** The user-preference key that governs each type. */
const PREF_KEY: Record<NotificationType, string> = {
  new_signal: 'newSignal',
  premium_signal: 'premiumSignal',
  signal_update: 'signalUpdate',
  news: 'news',
  lesson: 'lessons',
  poll: 'polls',
  community: 'community',
  announcement: 'announcements',
  subscription: 'subscription',
  join_request: 'announcements',
};

export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body: string;
  route?: string;
  imageUrl?: string;
  data?: Record<string, string>;
};

function toDataPayload(payload: NotificationPayload): Record<string, string> {
  return {
    type: payload.type,
    channel: CHANNEL[payload.type],
    ...(payload.route ? { route: payload.route } : {}),
    ...(payload.data ?? {}),
  };
}

/**
 * Sends to a topic and writes an in-app record for every user in that audience.
 * `audience` mirrors the FCM topic names.
 */
export async function broadcast(
  audience: 'all' | 'free' | 'premium',
  payload: NotificationPayload,
): Promise<void> {
  try {
    await messaging.send({
      topic: audience,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
      },
      data: toDataPayload(payload),
      android: {
        priority: 'high',
        notification: { channelId: CHANNEL[payload.type], color: '#00B8E6' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1, 'mutable-content': 1 } },
      },
    });
  } catch (err) {
    logger.error('topic broadcast failed', { audience, type: payload.type, err });
  }

  await writeInAppForAudience(audience, payload);
}

/**
 * Writes the in-app notification document for every user in the audience who
 * has that notification type enabled.
 */
async function writeInAppForAudience(
  audience: 'all' | 'free' | 'premium',
  payload: NotificationPayload,
): Promise<void> {
  const prefKey = PREF_KEY[payload.type];
  let query = db.collection('users').where('status', '==', 'active');
  if (audience !== 'all') query = query.where('plan', '==', audience);

  const snapshot = await query.select('notificationPrefs').get();
  if (snapshot.empty) return;

  // Firestore batches cap at 500 writes.
  const recipients = snapshot.docs.filter((doc) => {
    const prefs = (doc.get('notificationPrefs') ?? {}) as Record<string, boolean>;
    return prefs[prefKey] !== false;
  });

  for (let i = 0; i < recipients.length; i += 450) {
    const batch = db.batch();
    for (const doc of recipients.slice(i, i + 450)) {
      const ref = db.collection('notifications').doc(doc.id).collection('items').doc();
      batch.set(ref, {
        type: payload.type,
        title: payload.title,
        body: payload.body,
        route: payload.route ?? '',
        imageUrl: payload.imageUrl ?? '',
        data: payload.data ?? {},
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }
}

/** Sends to one user's devices and writes their in-app record. */
export async function notifyUser(uid: string, payload: NotificationPayload): Promise<void> {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return;

  const prefs = (userSnap.get('notificationPrefs') ?? {}) as Record<string, boolean>;
  if (prefs[PREF_KEY[payload.type]] === false) return;

  await db
    .collection('notifications')
    .doc(uid)
    .collection('items')
    .add({
      type: payload.type,
      title: payload.title,
      body: payload.body,
      route: payload.route ?? '',
      imageUrl: payload.imageUrl ?? '',
      data: payload.data ?? {},
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

  const tokens = await tokensFor(uid);
  if (tokens.length === 0) return;

  try {
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: toDataPayload(payload),
      android: { priority: 'high', notification: { channelId: CHANNEL[payload.type] } },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    await pruneDeadTokens(uid, tokens, response.responses);
  } catch (err) {
    logger.error('user notification failed', { uid, err });
  }
}

/** Notifies every admin — used for join requests and new registrations. */
export async function notifyAdmins(payload: NotificationPayload): Promise<void> {
  const admins = await db.collection('users').where('role', '==', 'admin').select().get();
  await Promise.all(admins.docs.map((doc) => notifyUser(doc.id, payload)));
}

async function tokensFor(uid: string): Promise<string[]> {
  const snap = await db.collection('users').doc(uid).collection('private').doc('devices').get();
  const tokens = snap.get('fcmTokens');
  return Array.isArray(tokens) ? (tokens as string[]).filter(Boolean).slice(0, 20) : [];
}

/**
 * Drops tokens the FCM API reports as permanently invalid, so a device that has
 * been wiped or reinstalled stops costing a send on every broadcast.
 */
async function pruneDeadTokens(
  uid: string,
  tokens: string[],
  responses: { success: boolean; error?: { code: string } }[],
): Promise<void> {
  const dead = tokens.filter((_, i) => {
    const error = responses[i]?.error?.code;
    return (
      error === 'messaging/registration-token-not-registered' ||
      error === 'messaging/invalid-registration-token' ||
      error === 'messaging/invalid-argument'
    );
  });
  if (dead.length === 0) return;

  await db
    .collection('users')
    .doc(uid)
    .collection('private')
    .doc('devices')
    .set({ fcmTokens: FieldValue.arrayRemove(...dead) }, { merge: true });
}
