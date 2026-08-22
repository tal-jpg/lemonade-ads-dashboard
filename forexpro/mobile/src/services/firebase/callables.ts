import { httpsCallable } from '@react-native-firebase/functions';
import { functions } from './client';
import { serviceError } from '../../utils/errors';
import { DEMO_MODE } from '../../config/demo';
import { demoDb, setDemoPlan } from '../demo/db';
import { castVote as demoCastVote } from '../demo/repos';

/**
 * Cloud Function callables.
 *
 * Anything privileged happens here, never in a direct Firestore write:
 * subscription verification, community moderation, role changes, poll tallies
 * and account deletion. The function re-checks the caller's claims server-side.
 */

function call<TRequest extends object | void, TResponse>(name: string) {
  return async (payload?: TRequest): Promise<TResponse> => {
    if (DEMO_MODE) return demoCallable(name, payload) as TResponse;
    try {
      const fn = httpsCallable<TRequest, TResponse>(functions(), name);
      const result = await fn((payload ?? {}) as TRequest);
      return result.data;
    } catch (err) {
      throw serviceError(err);
    }
  };
}

/**
 * Demo stand-ins for the callables the app can reach without a backend.
 * Anything not listed resolves to a benign success so no screen dead-ends.
 */
function demoCallable(name: string, payload: unknown): unknown {
  const data = (payload ?? {}) as Record<string, unknown>;

  switch (name) {
    case 'castVote': {
      const optionIds = Array.isArray(data.optionIds) ? (data.optionIds as string[]) : [];
      void demoCastVote(optionIds);
      return { ok: true, totals: {} };
    }
    case 'requestJoinCommunity':
      return { status: 'approved' };
    case 'verifyPurchase':
    case 'restorePurchases':
      setDemoPlan('premium');
      return { plan: 'premium', status: 'active', expiresAt: demoDb.user.get().planExpiresAt ?? null };
    default:
      return { ok: true };
  }
}

// ------------------------------------------------------------------ community

export const requestJoinCommunity = call<{ message?: string }, { status: string }>(
  'requestJoinCommunity',
);

// ---------------------------------------------------------------------- polls

export const castVote = call<
  { pollId: string; optionIds: string[] },
  { ok: true; totals: Record<string, number> }
>('castVote');

// --------------------------------------------------------------- purchases

export type VerifyPurchaseRequest = {
  platform: 'ios' | 'android';
  productId: string;
  /** iOS: the StoreKit transaction receipt. Android: the purchase token. */
  receipt: string;
};

export type VerifyPurchaseResponse = {
  plan: 'free' | 'premium';
  status: string;
  expiresAt: number | null;
};

export const verifyPurchase = call<VerifyPurchaseRequest, VerifyPurchaseResponse>('verifyPurchase');

export const restorePurchases = call<{ platform: 'ios' | 'android'; receipts: string[] }, VerifyPurchaseResponse>(
  'restorePurchases',
);

// -------------------------------------------------------------------- account

export const deleteAccount = call<{ reason?: string }, { ok: true }>('deleteAccount');

export const registerPushToken = call<{ token: string; platform: 'ios' | 'android' }, { ok: true }>(
  'registerPushToken',
);

export const unregisterPushToken = call<{ token: string }, { ok: true }>('unregisterPushToken');

// ------------------------------------------------------------------- reports

export const reportContent = call<
  { targetType: 'message' | 'user' | 'signal'; targetId: string; reason: string },
  { ok: true }
>('reportContent');

// --------------------------------------------------------------------- admin
// Called only by the admin dashboard, kept here so the contract lives in one
// place. The functions themselves reject any caller without the admin claim.

export const setUserRole = call<{ uid: string; role: 'user' | 'moderator' | 'admin' }, { ok: true }>(
  'setUserRole',
);

export const setUserPlan = call<
  { uid: string; plan: 'free' | 'premium'; expiresAt?: number },
  { ok: true }
>('setUserPlan');

export const moderateUser = call<
  {
    uid: string;
    action: 'suspend' | 'ban' | 'activate' | 'mute' | 'unmute' | 'remove_from_community';
    until?: number;
    reason?: string;
  },
  { ok: true }
>('moderateUser');

export const decideJoinRequest = call<
  { uid: string; decision: 'approve' | 'reject' | 'block' },
  { ok: true }
>('decideJoinRequest');
