import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
  type ProductSubscription,
} from 'react-native-iap';
import { verifyPurchase, restorePurchases } from './firebase/callables';
import { log } from '../utils/logger';
import type { BillingPeriod, PlanOffer } from '../types/models';
import { DEMO_MODE } from '../config/demo';
import { setDemoPlan } from './demo/db';

/**
 * In-app purchases.
 *
 * Apple IAP on iOS, Google Play Billing on Android — no external payment path,
 * as required for digital subscriptions on both stores.
 *
 * The entitlement is never granted on the device. The client sends the store
 * token to `verifyPurchase`, which validates it against the App Store Server
 * API or the Play Developer API and then mints the `plan` custom claim. A
 * tampered client can complete a purchase flow and still receive nothing.
 */

let connected = false;

/**
 * Offers shown in demo mode. Prices are illustrative; no store is contacted and
 * no charge is possible.
 */
const DEMO_OFFERS: PlanOffer[] = [
  {
    id: 'monthly',
    productId: 'forextradehub.premium.monthly',
    title: 'Monthly',
    price: '$29.99',
    priceAmount: 29.99,
    currency: 'USD',
    periodLabel: 'per month',
  },
  {
    id: 'quarterly',
    productId: 'forextradehub.premium.quarterly',
    title: 'Quarterly',
    price: '$74.99',
    priceAmount: 74.99,
    currency: 'USD',
    periodLabel: 'every 3 months',
    perMonthLabel: 'USD 25.00 / month',
    savingsPct: 17,
  },
  {
    id: 'yearly',
    productId: 'forextradehub.premium.yearly',
    title: 'Yearly',
    price: '$239.99',
    priceAmount: 239.99,
    currency: 'USD',
    periodLabel: 'per year',
    perMonthLabel: 'USD 20.00 / month',
    savingsPct: 33,
    highlighted: true,
  },
];

export async function connectStore(): Promise<boolean> {
  if (DEMO_MODE) return true;
  if (connected) return true;
  try {
    await initConnection();
    connected = true;
    return true;
  } catch (err) {
    log.error('IAP connection failed', err);
    return false;
  }
}

export async function disconnectStore(): Promise<void> {
  if (DEMO_MODE) return;
  if (!connected) return;
  try {
    await endConnection();
  } catch {
    // Nothing useful to do if teardown fails.
  } finally {
    connected = false;
  }
}

const PERIOD_LABEL: Record<BillingPeriod, string> = {
  monthly: 'per month',
  quarterly: 'every 3 months',
  yearly: 'per year',
};

const PERIOD_MONTHS: Record<BillingPeriod, number> = { monthly: 1, quarterly: 3, yearly: 12 };

function priceAmountOf(product: ProductSubscription): number {
  const raw = (product as unknown as { price?: number | string | null }).price;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Loads the three subscription products and shapes them for the paywall,
 * computing the "save X%" badge against the monthly price.
 */
export async function loadOffers(productIds: Record<BillingPeriod, string>): Promise<PlanOffer[]> {
  if (DEMO_MODE) return DEMO_OFFERS;
  const skus = [productIds.monthly, productIds.quarterly, productIds.yearly];

  const result = await fetchProducts({ skus, type: 'subs' });
  const products = (result ?? []) as ProductSubscription[];

  const byId = new Map(products.map((p) => [p.id, p]));
  const monthly = byId.get(productIds.monthly);
  const monthlyAmount = monthly ? priceAmountOf(monthly) : 0;

  const build = (period: BillingPeriod): PlanOffer | null => {
    const product = byId.get(productIds[period]);
    if (!product) return null;

    const amount = priceAmountOf(product);
    const months = PERIOD_MONTHS[period];
    const perMonth = months > 0 ? amount / months : amount;
    const savings =
      monthlyAmount > 0 && period !== 'monthly'
        ? Math.max(0, Math.round((1 - perMonth / monthlyAmount) * 100))
        : undefined;

    const currency = (product as unknown as { currency?: string }).currency ?? 'USD';

    return {
      id: period,
      productId: product.id,
      title: product.title || period,
      price: product.displayPrice ?? `${amount}`,
      priceAmount: amount,
      currency,
      periodLabel: PERIOD_LABEL[period],
      perMonthLabel:
        months > 1 && perMonth > 0 ? `${currency} ${perMonth.toFixed(2)} / month` : undefined,
      savingsPct: savings && savings > 0 ? savings : undefined,
      highlighted: period === 'yearly',
    };
  };

  return (['monthly', 'quarterly', 'yearly'] as BillingPeriod[])
    .map(build)
    .filter((o): o is PlanOffer => o !== null);
}

/** Opens the native purchase sheet. Entitlement follows from verification. */
export async function buy(productId: string): Promise<void> {
  if (DEMO_MODE) {
    setDemoPlan('premium');
    return;
  }
  await requestPurchase({
    type: 'subs',
    request: {
      apple: { sku: productId },
      google: { skus: [productId] },
    },
  });
}

/**
 * Sends the store token to the backend and closes the transaction.
 * `finishTransaction` runs only after the server has recorded the entitlement,
 * so a crash mid-flow leaves the purchase to be replayed rather than lost.
 */
export async function verifyAndFinish(purchase: Purchase): Promise<void> {
  const token = purchase.purchaseToken;
  if (!token) {
    log.warn('purchase has no token; skipping verification');
    return;
  }

  await verifyPurchase({
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    productId: purchase.productId,
    receipt: token,
  });

  await finishTransaction({ purchase, isConsumable: false });
}

/** Re-sends every owned purchase for verification. */
export async function restore(): Promise<number> {
  if (DEMO_MODE) {
    setDemoPlan('premium');
    return 1;
  }
  const purchases = await getAvailablePurchases();
  const receipts = purchases
    .map((p) => p.purchaseToken)
    .filter((t): t is string => typeof t === 'string' && t.length > 0);

  if (receipts.length === 0) return 0;

  await restorePurchases({
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    receipts,
  });
  return receipts.length;
}

const NO_SUBSCRIPTION = { remove: () => undefined };

export function onPurchaseUpdated(handler: (purchase: Purchase) => void) {
  // In demo mode `buy()` resolves the entitlement directly, so there is no
  // store event to listen for.
  if (DEMO_MODE) return NO_SUBSCRIPTION;
  return purchaseUpdatedListener(handler);
}

export function onPurchaseError(handler: (error: PurchaseError) => void) {
  if (DEMO_MODE) return NO_SUBSCRIPTION;
  return purchaseErrorListener(handler);
}
