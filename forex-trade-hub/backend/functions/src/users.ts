import * as functionsV1 from 'firebase-functions/v1';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  auth,
  db,
  DEFAULT_CLAIMS,
  FieldValue,
  auditLog,
  expectOneOf,
  expectString,
  mergeClaims,
  requireAdmin,
  requireAuth,
  requireModerator,
} from './common';
import { notifyAdmins, notifyUser } from './notifications';

/**
 * Account lifecycle, roles and moderation.
 *
 * The invariant this file exists to protect: role, plan, account status and
 * community membership are decided here and expressed as custom claims. The
 * mirrored fields on /users/{uid} are written in the same transaction purely so
 * the admin dashboard can query and display them.
 */

// ------------------------------------------------------- account creation

/**
 * Stamps default claims on every new account.
 *
 * v1 auth trigger by design: the v2 blocking equivalent requires Identity
 * Platform, and this does not need to run before account creation completes.
 */
export const onUserCreated = functionsV1.auth.user().onCreate(async (user) => {
  try {
    await auth.setCustomUserClaims(user.uid, DEFAULT_CLAIMS);
    await notifyAdmins({
      type: 'join_request',
      title: 'New registration',
      body: `${user.displayName ?? user.email ?? 'A new user'} created an account.`,
      route: '/notifications',
      data: { uid: user.uid },
    });
  } catch (err) {
    logger.error('onUserCreated failed', { uid: user.uid, err });
  }
});

/**
 * Cleans up everything the deleted account owned. Runs whether the deletion
 * came from the app, the admin dashboard or the Firebase console.
 */
export const onUserDeleted = functionsV1.auth.user().onDelete(async (user) => {
  const uid = user.uid;
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    const username = userDoc.get('usernameLower') ?? userDoc.get('username');

    const batch = db.batch();
    batch.delete(db.collection('users').doc(uid));
    batch.delete(db.collection('community_members').doc(uid));
    batch.delete(db.collection('join_requests').doc(uid));
    batch.delete(db.collection('subscriptions').doc(uid));
    if (typeof username === 'string' && username) {
      batch.delete(db.collection('usernames').doc(username));
    }
    await batch.commit();

    await db.recursiveDelete(db.collection('users').doc(uid).collection('private'));
    await db.recursiveDelete(db.collection('notifications').doc(uid));
    await db.recursiveDelete(db.collection('user_progress').doc(uid));

    // Messages are soft-deleted rather than removed, so replies pointing at
    // them still resolve and moderation history stays intact.
    const messages = await db
      .collectionGroup('messages')
      .where('authorId', '==', uid)
      .limit(500)
      .get();
    if (!messages.empty) {
      const scrub = db.batch();
      messages.docs.forEach((doc) =>
        scrub.update(doc.ref, {
          deleted: true,
          deletedBy: 'account_deleted',
          text: '',
          media: null,
          authorName: 'Deleted user',
          authorPhoto: '',
        }),
      );
      await scrub.commit();
    }
  } catch (err) {
    logger.error('onUserDeleted cleanup failed', { uid, err });
  }
});

/**
 * User-initiated account deletion (required by both app stores).
 * Deleting the auth record triggers onUserDeleted for the data cleanup.
 */
export const deleteAccount = onCall(async (request) => {
  const uid = requireAuth(request);
  const reason = typeof request.data?.reason === 'string' ? request.data.reason : 'user_requested';

  await auditLog(uid, 'account.delete', { type: 'user', id: uid }, { reason });
  await auth.deleteUser(uid);
  return { ok: true as const };
});

// -------------------------------------------------------------- push tokens

export const registerPushToken = onCall(async (request) => {
  const uid = requireAuth(request);
  const token = expectString(request.data?.token, 'token', 4096);
  const platform = expectOneOf(request.data?.platform, ['ios', 'android'] as const, 'platform');

  await db
    .collection('users')
    .doc(uid)
    .collection('private')
    .doc('devices')
    .set(
      {
        fcmTokens: FieldValue.arrayUnion(token),
        [`platforms.${platform}`]: true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return { ok: true as const };
});

export const unregisterPushToken = onCall(async (request) => {
  const uid = requireAuth(request);
  const token = expectString(request.data?.token, 'token', 4096);

  await db
    .collection('users')
    .doc(uid)
    .collection('private')
    .doc('devices')
    .set({ fcmTokens: FieldValue.arrayRemove(token) }, { merge: true });

  return { ok: true as const };
});

// -------------------------------------------------------------------- roles

export const setUserRole = onCall(async (request) => {
  const actor = requireAdmin(request);
  const uid = expectString(request.data?.uid, 'uid', 128);
  const role = expectOneOf(request.data?.role, ['user', 'moderator', 'admin'] as const, 'role');

  // An admin cannot demote themselves; that is how a project ends up with no
  // administrator at all.
  if (uid === actor && role !== 'admin') {
    throw new HttpsError('failed-precondition', 'You cannot remove your own admin access.');
  }

  await mergeClaims(uid, { admin: role === 'admin', moderator: role !== 'user' });
  await db.collection('users').doc(uid).update({ role, updatedAt: FieldValue.serverTimestamp() });
  await auditLog(actor, 'user.role_changed', { type: 'user', id: uid }, { role });

  await notifyUser(uid, {
    type: 'announcement',
    title: 'Your access changed',
    body:
      role === 'user'
        ? 'Your staff permissions have been removed.'
        : `You are now ${role === 'admin' ? 'an administrator' : 'a moderator'}.`,
  });

  return { ok: true as const };
});

/**
 * Manual plan override — comped accounts, support gestures, refunds.
 * Store-driven changes go through verifyPurchase instead.
 */
export const setUserPlan = onCall(async (request) => {
  const actor = requireAdmin(request);
  const uid = expectString(request.data?.uid, 'uid', 128);
  const plan = expectOneOf(request.data?.plan, ['free', 'premium'] as const, 'plan');
  const expiresAt =
    typeof request.data?.expiresAt === 'number' ? (request.data.expiresAt as number) : null;

  await mergeClaims(uid, { plan });

  const batch = db.batch();
  batch.update(db.collection('users').doc(uid), {
    plan,
    planSource: 'manual',
    planExpiresAt: expiresAt,
    updatedAt: FieldValue.serverTimestamp(),
  });
  batch.set(
    db.collection('subscriptions').doc(uid),
    {
      uid,
      plan,
      status: plan === 'premium' ? 'active' : 'expired',
      store: 'manual',
      expiresAt,
      autoRenewing: false,
      lastVerifiedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  await auditLog(actor, 'user.plan_changed', { type: 'user', id: uid }, { plan, expiresAt });
  await notifyUser(uid, {
    type: 'subscription',
    title: plan === 'premium' ? 'Premium unlocked' : 'Plan changed',
    body:
      plan === 'premium'
        ? 'Your account now has full Premium access.'
        : 'Your account has been moved to the free plan.',
    route: '/premium',
  });

  return { ok: true as const };
});

// --------------------------------------------------------------- moderation

export const moderateUser = onCall(async (request) => {
  const actor = requireModerator(request);
  const uid = expectString(request.data?.uid, 'uid', 128);
  const action = expectOneOf(
    request.data?.action,
    ['suspend', 'ban', 'activate', 'mute', 'unmute', 'remove_from_community'] as const,
    'action',
  );
  const until = typeof request.data?.until === 'number' ? (request.data.until as number) : null;
  const reason = typeof request.data?.reason === 'string' ? request.data.reason : '';

  if (uid === actor) {
    throw new HttpsError('failed-precondition', 'You cannot moderate your own account.');
  }

  const userRef = db.collection('users').doc(uid);
  const memberRef = db.collection('community_members').doc(uid);

  switch (action) {
    case 'suspend':
    case 'ban': {
      const status = action === 'ban' ? 'banned' : 'suspended';
      await mergeClaims(uid, { status });
      await userRef.update({ status, updatedAt: FieldValue.serverTimestamp() });
      break;
    }
    case 'activate': {
      await mergeClaims(uid, { status: 'active' });
      await userRef.update({ status: 'active', updatedAt: FieldValue.serverTimestamp() });
      break;
    }
    case 'mute': {
      const mutedUntil = until ?? Date.now() + 24 * 60 * 60 * 1000;
      await mergeClaims(uid, { mutedUntil });
      await userRef.update({
        'community.mutedUntil': mutedUntil,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await memberRef.set({ mutedUntil }, { merge: true });
      break;
    }
    case 'unmute': {
      await mergeClaims(uid, { mutedUntil: 0 });
      await userRef.update({
        'community.mutedUntil': null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      await memberRef.set({ mutedUntil: null }, { merge: true });
      break;
    }
    case 'remove_from_community': {
      await mergeClaims(uid, { community: 'blocked' });
      await userRef.update({
        'community.status': 'blocked',
        updatedAt: FieldValue.serverTimestamp(),
      });
      await memberRef.delete();
      await adjustMemberCount(-1);
      break;
    }
  }

  await auditLog(actor, `user.${action}`, { type: 'user', id: uid }, { reason, until });

  await notifyUser(uid, {
    type: 'announcement',
    title: 'Account update',
    body:
      action === 'ban'
        ? 'Your account has been banned.'
        : action === 'suspend'
          ? 'Your account has been suspended.'
          : action === 'mute'
            ? 'You have been muted in the community.'
            : action === 'remove_from_community'
              ? 'You have been removed from the community.'
              : 'Your account restrictions have been lifted.',
  });

  return { ok: true as const };
});

// ----------------------------------------------------------- join requests

export const requestJoinCommunity = onCall(async (request) => {
  const uid = requireAuth(request);
  const message = typeof request.data?.message === 'string' ? request.data.message.slice(0, 300) : '';

  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) throw new HttpsError('not-found', 'Profile not found.');

  const current = userSnap.get('community')?.status as string | undefined;
  if (current === 'approved') return { status: 'approved' };
  if (current === 'blocked') {
    throw new HttpsError('permission-denied', 'You cannot join this community.');
  }

  await db.collection('join_requests').doc(uid).set(
    {
      uid,
      fullName: userSnap.get('fullName') ?? '',
      username: userSnap.get('username') ?? '',
      email: userSnap.get('email') ?? '',
      photoURL: userSnap.get('photoURL') ?? '',
      message,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await mergeClaims(uid, { community: 'pending' });
  await db.collection('users').doc(uid).update({
    'community.status': 'pending',
    updatedAt: FieldValue.serverTimestamp(),
  });

  await notifyAdmins({
    type: 'join_request',
    title: 'New community join request',
    body: `${userSnap.get('fullName') ?? 'A member'} requested access to the community.`,
    route: '/notifications',
    data: { uid },
  });

  return { status: 'pending' };
});

export const decideJoinRequest = onCall(async (request) => {
  const actor = requireModerator(request);
  const uid = expectString(request.data?.uid, 'uid', 128);
  const decision = expectOneOf(
    request.data?.decision,
    ['approve', 'reject', 'block'] as const,
    'decision',
  );

  const status = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : 'blocked';

  await mergeClaims(uid, { community: status });

  const userSnap = await db.collection('users').doc(uid).get();
  const batch = db.batch();

  batch.update(db.collection('users').doc(uid), {
    'community.status': status,
    ...(decision === 'approve' ? { 'community.joinedAt': FieldValue.serverTimestamp() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  batch.update(db.collection('join_requests').doc(uid), {
    status,
    decidedAt: FieldValue.serverTimestamp(),
    decidedBy: actor,
  });

  if (decision === 'approve') {
    batch.set(db.collection('community_members').doc(uid), {
      uid,
      displayName: userSnap.get('fullName') ?? 'Member',
      username: userSnap.get('username') ?? '',
      photoURL: userSnap.get('photoURL') ?? '',
      role: userSnap.get('role') ?? 'user',
      plan: userSnap.get('plan') ?? 'free',
      status: 'approved',
      joinedAt: FieldValue.serverTimestamp(),
    });
  } else {
    batch.delete(db.collection('community_members').doc(uid));
  }

  await batch.commit();
  if (decision === 'approve') await adjustMemberCount(1);

  await auditLog(actor, `community.${decision}`, { type: 'user', id: uid });

  await notifyUser(uid, {
    type: 'community',
    title: decision === 'approve' ? 'Welcome to the community' : 'Community request reviewed',
    body:
      decision === 'approve'
        ? 'Your request was approved. The trading floor is now open to you.'
        : 'Your request to join the community was not approved.',
    route: decision === 'approve' ? '/chat' : undefined,
  });

  return { ok: true as const };
});

async function adjustMemberCount(delta: number): Promise<void> {
  await db
    .collection('community')
    .doc('main')
    .set(
      { memberCount: FieldValue.increment(delta), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
}

// ------------------------------------------------------------------ reports

export const reportContent = onCall(async (request) => {
  const uid = requireAuth(request);
  const targetType = expectOneOf(
    request.data?.targetType,
    ['message', 'user', 'signal'] as const,
    'targetType',
  );
  const targetId = expectString(request.data?.targetId, 'targetId', 128);
  const reason = expectString(request.data?.reason, 'reason', 500);

  await db.collection('reports').add({
    reporterId: uid,
    targetType,
    targetId,
    reason,
    status: 'open',
    createdAt: FieldValue.serverTimestamp(),
  });

  await notifyAdmins({
    type: 'announcement',
    title: 'Content reported',
    body: `A ${targetType} was reported for review.`,
    data: { targetType, targetId },
  });

  return { ok: true as const };
});
