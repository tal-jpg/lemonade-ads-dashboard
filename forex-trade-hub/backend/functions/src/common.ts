import * as admin from 'firebase-admin';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

/**
 * Shared helpers: the Admin SDK singleton, claim management, guards and the
 * audit log.
 *
 * Every privileged operation in this codebase funnels through `requireAdmin`
 * or `requireAuth` — a callable that forgets to call one has no access to the
 * caller's identity at all, which makes the omission obvious in review.
 */

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const db = admin.firestore();
export const auth = admin.auth();
export const messaging = admin.messaging();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

export type PlanId = 'free' | 'premium';
export type UserRole = 'user' | 'moderator' | 'admin';
export type CommunityStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'blocked';
export type AccountStatus = 'active' | 'suspended' | 'banned';

/**
 * The complete set of custom claims. Security rules read only these — never a
 * Firestore field — for authorization.
 */
export type AppClaims = {
  admin?: boolean;
  moderator?: boolean;
  plan?: PlanId;
  community?: CommunityStatus;
  status?: AccountStatus;
  mutedUntil?: number;
};

export const DEFAULT_CLAIMS: AppClaims = {
  admin: false,
  moderator: false,
  plan: 'free',
  community: 'none',
  status: 'active',
};

/**
 * Merges claims onto a user, preserving anything not being changed.
 * Firebase caps custom claims at 1000 bytes; this set is well inside that.
 */
export async function mergeClaims(uid: string, patch: AppClaims): Promise<AppClaims> {
  const user = await auth.getUser(uid);
  const next: AppClaims = { ...DEFAULT_CLAIMS, ...(user.customClaims as AppClaims), ...patch };
  await auth.setCustomUserClaims(uid, next);
  // Revoking refresh tokens forces the client to fetch a token carrying the new
  // claims, so a downgrade takes effect immediately rather than in up to an hour.
  await auth.revokeRefreshTokens(uid);
  return next;
}

export function requireAuth(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'You must be signed in.');
  if (request.auth?.token?.status === 'banned') {
    throw new HttpsError('permission-denied', 'This account has been disabled.');
  }
  return uid;
}

export function requireAdmin(request: CallableRequest): string {
  const uid = requireAuth(request);
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Administrator access is required.');
  }
  return uid;
}

export function requireModerator(request: CallableRequest): string {
  const uid = requireAuth(request);
  const token = request.auth?.token;
  if (token?.admin !== true && token?.moderator !== true) {
    throw new HttpsError('permission-denied', 'Moderator access is required.');
  }
  return uid;
}

/** Append-only audit trail. Clients can read it (if admin) but never write it. */
export async function auditLog(
  actorId: string,
  action: string,
  target: { type: string; id: string },
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    let actorName = actorId;
    const actor = await db.collection('users').doc(actorId).get();
    if (actor.exists) actorName = (actor.data()?.fullName as string) ?? actorId;

    await db.collection('admin_logs').add({
      actorId,
      actorName,
      action,
      targetType: target.type,
      targetId: target.id,
      meta,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // An audit write must never fail the operation it is recording.
    logger.error('audit log write failed', { action, err });
  }
}

/** Reads the runtime settings document, with the same defaults as the app. */
export async function appSettings(): Promise<Record<string, any>> {
  const snap = await db.collection('app_settings').doc('config').get();
  return snap.exists ? (snap.data() as Record<string, any>) : {};
}

export function nowMs(): number {
  return Date.now();
}

/** Validates and narrows a string against an allow-list. */
export function expectOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new HttpsError('invalid-argument', `${field} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export function expectString(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }
  if (value.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} is too long.`);
  }
  return value.trim();
}
