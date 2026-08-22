import * as crypto from 'crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions';
import { GoogleAuth } from 'google-auth-library';
import {
  db,
  FieldValue,
  auditLog,
  expectOneOf,
  expectString,
  mergeClaims,
  requireAuth,
} from './common';
import { notifyUser } from './notifications';

/**
 * Subscription verification.
 *
 * The rule this file enforces: a device never grants itself premium. The client
 * sends a store token; this code validates it directly with Apple or Google and
 * only then writes the subscription document and mints the `plan` claim.
 *
 * Configuration (see docs/FIREBASE_SETUP.md):
 *   APPLE_ISSUER_ID / APPLE_KEY_ID / APPLE_BUNDLE_ID  — params
 *   APPLE_PRIVATE_KEY                                 — secret (.p8 contents)
 *   ANDROID_PACKAGE_NAME                              — param
 *   Play access uses the function's own service account, which must be granted
 *   access in the Play Console.
 */

const APPLE_ISSUER_ID = defineString('APPLE_ISSUER_ID', { default: '' });
const APPLE_KEY_ID = defineString('APPLE_KEY_ID', { default: '' });
const APPLE_BUNDLE_ID = defineString('APPLE_BUNDLE_ID', { default: 'com.forextradehub.app' });
const ANDROID_PACKAGE_NAME = defineString('ANDROID_PACKAGE_NAME', { default: 'com.forextradehub.app' });
const APPLE_PRIVATE_KEY = defineSecret('APPLE_PRIVATE_KEY');

type VerificationResult = {
  valid: boolean;
  productId: string;
  expiresAt: number | null;
  autoRenewing: boolean;
  environment: 'sandbox' | 'production';
  originalTransactionId?: string;
  status: 'active' | 'in_grace' | 'on_hold' | 'cancelled' | 'expired' | 'refunded';
};

// ------------------------------------------------------------------- Apple

function base64UrlDecode(segment: string): Buffer {
  return Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/**
 * Decodes a StoreKit 2 JWS payload.
 *
 * Decoding alone is NOT verification — the payload is attacker-controlled until
 * the signature is checked. It is used here only to read the transaction id, so
 * the authoritative state can be fetched from the App Store Server API below.
 */
function decodeJwsPayload(jws: string): Record<string, any> | null {
  const parts = jws.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1]).toString('utf8'));
  } catch {
    return null;
  }
}

/** Signs the ES256 JWT the App Store Server API requires. */
function appleServerToken(): string {
  const privateKey = APPLE_PRIVATE_KEY.value();
  const issuerId = APPLE_ISSUER_ID.value();
  const keyId = APPLE_KEY_ID.value();

  if (!privateKey || !issuerId || !keyId) {
    throw new HttpsError('failed-precondition', 'App Store credentials are not configured.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 20 * 60,
    aud: 'appstoreconnect-v1',
    bid: APPLE_BUNDLE_ID.value(),
  };

  const encode = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');

  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.sign('sha256', Buffer.from(signingInput), {
    key: crypto.createPrivateKey(privateKey),
    dsaEncoding: 'ieee-p1363',
  });

  return `${signingInput}.${signature.toString('base64url')}`;
}

/**
 * Asks Apple for the authoritative state of a subscription.
 * Falls back to the sandbox host, which is what App Review uses.
 */
async function verifyApple(jwsOrTransactionId: string): Promise<VerificationResult> {
  const decoded = decodeJwsPayload(jwsOrTransactionId);
  const transactionId =
    (decoded?.transactionId as string | undefined) ??
    (decoded?.originalTransactionId as string | undefined) ??
    jwsOrTransactionId;

  const token = appleServerToken();
  const hosts = [
    'https://api.storekit.itunes.apple.com',
    'https://api.storekit-sandbox.itunes.apple.com',
  ];

  for (const host of hosts) {
    const response = await fetch(`${host}/inApps/v1/subscriptions/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) continue; // Try the other environment.
    if (!response.ok) {
      logger.warn('App Store verification returned an error', {
        status: response.status,
        host,
      });
      continue;
    }

    const body = (await response.json()) as {
      environment?: string;
      data?: { lastTransactions?: { status?: number; signedTransactionInfo?: string; signedRenewalInfo?: string }[] }[];
    };

    const latest = body.data?.[0]?.lastTransactions?.[0];
    if (!latest?.signedTransactionInfo) continue;

    const transaction = decodeJwsPayload(latest.signedTransactionInfo) ?? {};
    const renewal = latest.signedRenewalInfo ? decodeJwsPayload(latest.signedRenewalInfo) : null;

    // Apple status: 1 active, 2 expired, 3 billing retry, 4 grace, 5 revoked
    const appleStatus = latest.status ?? 0;
    const status: VerificationResult['status'] =
      appleStatus === 1
        ? 'active'
        : appleStatus === 4
          ? 'in_grace'
          : appleStatus === 3
            ? 'on_hold'
            : appleStatus === 5
              ? 'refunded'
              : 'expired';

    const expiresAt =
      typeof transaction.expiresDate === 'number' ? (transaction.expiresDate as number) : null;

    return {
      valid: status === 'active' || status === 'in_grace',
      productId: String(transaction.productId ?? ''),
      expiresAt,
      autoRenewing: renewal?.autoRenewStatus === 1,
      environment: body.environment === 'Sandbox' ? 'sandbox' : 'production',
      originalTransactionId: String(transaction.originalTransactionId ?? transactionId),
      status,
    };
  }

  return {
    valid: false,
    productId: '',
    expiresAt: null,
    autoRenewing: false,
    environment: 'production',
    status: 'expired',
  };
}

// ------------------------------------------------------------------ Google

/**
 * Verifies a Play purchase token via the Android Publisher API using the
 * function's own service account (grant it access in the Play Console).
 */
async function verifyGoogle(productId: string, purchaseToken: string): Promise<VerificationResult> {
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const packageName = ANDROID_PACKAGE_NAME.value();
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken.token ?? ''}` },
  });

  if (!response.ok) {
    logger.warn('Play verification failed', { status: response.status });
    return {
      valid: false,
      productId,
      expiresAt: null,
      autoRenewing: false,
      environment: 'production',
      status: 'expired',
    };
  }

  const body = (await response.json()) as {
    subscriptionState?: string;
    testPurchase?: object;
    lineItems?: { expiryTime?: string; productId?: string; autoRenewingPlan?: { autoRenewEnabled?: boolean } }[];
  };

  const line = body.lineItems?.[0];
  const expiresAt = line?.expiryTime ? Date.parse(line.expiryTime) : null;

  const state = body.subscriptionState ?? '';
  const status: VerificationResult['status'] =
    state === 'SUBSCRIPTION_STATE_ACTIVE'
      ? 'active'
      : state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'
        ? 'in_grace'
        : state === 'SUBSCRIPTION_STATE_ON_HOLD' || state === 'SUBSCRIPTION_STATE_PAUSED'
          ? 'on_hold'
          : state === 'SUBSCRIPTION_STATE_CANCELED'
            ? 'cancelled'
            : 'expired';

  // A cancelled subscription still grants access until it expires.
  const stillEntitled =
    status === 'active' ||
    status === 'in_grace' ||
    (status === 'cancelled' && expiresAt !== null && expiresAt > Date.now());

  return {
    valid: stillEntitled,
    productId: line?.productId ?? productId,
    expiresAt,
    autoRenewing: line?.autoRenewingPlan?.autoRenewEnabled === true,
    environment: body.testPurchase ? 'sandbox' : 'production',
    status,
  };
}

// ------------------------------------------------------------- entitlement

async function applyEntitlement(
  uid: string,
  platform: 'ios' | 'android',
  result: VerificationResult,
): Promise<void> {
  const plan = result.valid ? 'premium' : 'free';

  await mergeClaims(uid, { plan });

  const batch = db.batch();

  batch.set(
    db.collection('subscriptions').doc(uid),
    {
      uid,
      plan,
      status: result.status,
      productId: result.productId,
      store: platform === 'ios' ? 'apple' : 'google',
      expiresAt: result.expiresAt,
      autoRenewing: result.autoRenewing,
      environment: result.environment,
      originalTransactionId: result.originalTransactionId ?? null,
      lastVerifiedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.update(db.collection('users').doc(uid), {
    plan,
    planSource: platform === 'ios' ? 'apple' : 'google',
    planExpiresAt: result.expiresAt,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // An immutable record of every verification, for support and reconciliation.
  await db.collection('purchase_events').add({
    uid,
    platform,
    productId: result.productId,
    status: result.status,
    valid: result.valid,
    expiresAt: result.expiresAt,
    environment: result.environment,
    createdAt: FieldValue.serverTimestamp(),
  });
}

// -------------------------------------------------------------- callables

export const verifyPurchase = onCall(
  { secrets: [APPLE_PRIVATE_KEY] },
  async (request) => {
    const uid = requireAuth(request);
    const platform = expectOneOf(request.data?.platform, ['ios', 'android'] as const, 'platform');
    const productId = expectString(request.data?.productId, 'productId', 200);
    const receipt = expectString(request.data?.receipt, 'receipt', 8192);

    const result =
      platform === 'ios' ? await verifyApple(receipt) : await verifyGoogle(productId, receipt);

    await applyEntitlement(uid, platform, result);

    if (result.valid) {
      await notifyUser(uid, {
        type: 'subscription',
        title: 'Premium activated',
        body: 'You now have full access to every signal, the complete course and daily reviews.',
        route: '/premium',
      });
    }

    return {
      plan: result.valid ? ('premium' as const) : ('free' as const),
      status: result.status,
      expiresAt: result.expiresAt,
    };
  },
);

/** Re-verifies every owned purchase — the "Restore purchases" button. */
export const restorePurchases = onCall(
  { secrets: [APPLE_PRIVATE_KEY] },
  async (request) => {
    const uid = requireAuth(request);
    const platform = expectOneOf(request.data?.platform, ['ios', 'android'] as const, 'platform');
    const receipts = Array.isArray(request.data?.receipts)
      ? (request.data.receipts as unknown[]).filter((r): r is string => typeof r === 'string')
      : [];

    if (receipts.length === 0) {
      throw new HttpsError('invalid-argument', 'No purchases were provided.');
    }

    let best: VerificationResult | null = null;
    for (const receipt of receipts.slice(0, 10)) {
      const result =
        platform === 'ios' ? await verifyApple(receipt) : await verifyGoogle('', receipt);
      // Keep the entitlement that runs longest.
      if (result.valid && (!best || (result.expiresAt ?? 0) > (best.expiresAt ?? 0))) {
        best = result;
      }
    }

    const resolved: VerificationResult = best ?? {
      valid: false,
      productId: '',
      expiresAt: null,
      autoRenewing: false,
      environment: 'production',
      status: 'expired',
    };

    await applyEntitlement(uid, platform, resolved);

    return {
      plan: resolved.valid ? ('premium' as const) : ('free' as const),
      status: resolved.status,
      expiresAt: resolved.expiresAt,
    };
  },
);

// --------------------------------------------------------------- webhooks

/**
 * App Store Server Notifications V2.
 *
 * Configure the URL in App Store Connect. Renewals, cancellations, refunds and
 * billing failures arrive here, which is what keeps entitlement correct when
 * the app is never opened.
 */
export const appStoreNotifications = onRequest(
  { secrets: [APPLE_PRIVATE_KEY], cors: false },
  async (req, res) => {
    try {
      const signedPayload = (req.body as { signedPayload?: string })?.signedPayload;
      if (!signedPayload) {
        res.status(400).send('missing signedPayload');
        return;
      }

      const payload = decodeJwsPayload(signedPayload);
      const notificationType = payload?.notificationType as string | undefined;
      const transactionInfo = payload?.data?.signedTransactionInfo
        ? decodeJwsPayload(payload.data.signedTransactionInfo)
        : null;

      const originalTransactionId = transactionInfo?.originalTransactionId as string | undefined;
      if (!originalTransactionId) {
        // Nothing actionable, but acknowledge so Apple stops retrying.
        res.status(200).send('ok');
        return;
      }

      // Re-verify from the server API rather than trusting the notification body.
      const result = await verifyApple(originalTransactionId);

      const owner = await db
        .collection('subscriptions')
        .where('originalTransactionId', '==', originalTransactionId)
        .limit(1)
        .get();

      if (!owner.empty) {
        await applyEntitlement(owner.docs[0].id, 'ios', result);
        logger.info('App Store notification applied', {
          notificationType,
          uid: owner.docs[0].id,
          status: result.status,
        });
      } else {
        logger.warn('App Store notification for an unknown subscription', {
          originalTransactionId,
        });
      }

      res.status(200).send('ok');
    } catch (err) {
      logger.error('appStoreNotifications failed', err);
      // 500 makes Apple retry, which is what we want for a transient failure.
      res.status(500).send('error');
    }
  },
);

/**
 * Google Play Real-Time Developer Notifications.
 *
 * Play publishes to a Pub/Sub topic; point a push subscription at this URL.
 */
export const playNotifications = onRequest({ cors: false }, async (req, res) => {
  try {
    const message = (req.body as { message?: { data?: string } })?.message;
    if (!message?.data) {
      res.status(400).send('missing message');
      return;
    }

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf8')) as {
      subscriptionNotification?: { purchaseToken?: string; subscriptionId?: string };
    };

    const purchaseToken = decoded.subscriptionNotification?.purchaseToken;
    if (!purchaseToken) {
      res.status(200).send('ok');
      return;
    }

    const owner = await db
      .collection('subscriptions')
      .where('originalTransactionId', '==', purchaseToken)
      .limit(1)
      .get();

    if (!owner.empty) {
      const result = await verifyGoogle(
        decoded.subscriptionNotification?.subscriptionId ?? '',
        purchaseToken,
      );
      await applyEntitlement(owner.docs[0].id, 'android', result);
    }

    res.status(200).send('ok');
  } catch (err) {
    logger.error('playNotifications failed', err);
    res.status(500).send('error');
  }
});

// ------------------------------------------------------------ expiry sweep

/**
 * Safety net.
 *
 * Webhooks can be missed. This runs hourly and downgrades any subscription that
 * is past its expiry, so a lapsed account never keeps premium indefinitely.
 */
export const expireSubscriptions = onSchedule(
  { schedule: 'every 60 minutes', region: 'us-central1' },
  async () => {
    const snapshot = await db
      .collection('subscriptions')
      .where('plan', '==', 'premium')
      .where('expiresAt', '<', Date.now())
      .limit(300)
      .get();

    if (snapshot.empty) return;

    for (const doc of snapshot.docs) {
      const uid = doc.id;
      try {
        await mergeClaims(uid, { plan: 'free' });
        await doc.ref.update({
          plan: 'free',
          status: 'expired',
          lastVerifiedAt: FieldValue.serverTimestamp(),
        });
        await db.collection('users').doc(uid).update({
          plan: 'free',
          updatedAt: FieldValue.serverTimestamp(),
        });
        await notifyUser(uid, {
          type: 'subscription',
          title: 'Your Premium access has ended',
          body: 'Renew to keep full signals, the complete course and daily reviews.',
          route: '/premium',
        });
        await auditLog('system', 'subscription.expired', { type: 'user', id: uid });
      } catch (err) {
        logger.error('failed to expire subscription', { uid, err });
      }
    }

    logger.info('expired subscriptions processed', { count: snapshot.size });
  },
);
