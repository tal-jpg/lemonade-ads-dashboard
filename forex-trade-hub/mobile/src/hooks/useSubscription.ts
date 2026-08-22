import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlanOffer } from '../types/models';
import {
  connectStore,
  disconnectStore,
  loadOffers,
  buy,
  verifyAndFinish,
  restore,
  onPurchaseUpdated,
  onPurchaseError,
} from '../services/iap';
import { useAppSettings } from './useAppSettings';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/uiStore';
import { toAppError } from '../utils/errors';
import { log } from '../utils/logger';
import { track } from '../services/analytics';
import { DEMO_MODE } from '../config/demo';

/**
 * Paywall state machine.
 *
 * Owns the store connection for as long as the paywall is mounted, listens for
 * purchase results, and refreshes the auth claims once the backend confirms the
 * entitlement — that refresh is what actually unlocks premium in the UI.
 */
export function useSubscription() {
  const settings = useAppSettings();
  const refreshClaims = useAuthStore((s) => s.refreshClaims);
  const subscription = useAuthStore((s) => s.subscription);

  const [offers, setOffers] = useState<PlanOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeUnavailable, setStoreUnavailable] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ok = await connectStore();
      if (!ok) {
        setStoreUnavailable(true);
        setError('The store is unavailable right now. Please try again shortly.');
        return;
      }
      setStoreUnavailable(false);
      const next = await loadOffers(settings.products);
      if (!mounted.current) return;
      setOffers(next);
      if (next.length === 0) {
        setError('No subscription plans are available right now.');
      }
    } catch (err) {
      log.error('failed to load subscription offers', err);
      if (mounted.current) setError(toAppError(err).message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [settings.products]);

  useEffect(() => {
    void load();
    return () => {
      void disconnectStore();
    };
  }, [load]);

  // Purchases can also arrive unprompted (a renewal, or a flow the user
  // completed while the app was closed), so the listener — not the button — is
  // what completes the transaction.
  useEffect(() => {
    const updated = onPurchaseUpdated(async (purchase) => {
      try {
        await verifyAndFinish(purchase);
        await refreshClaims();
        void track({ name: 'purchase_completed', params: { product_id: purchase.productId } });
        toast.success('Welcome to Premium.');
      } catch (err) {
        log.error('purchase verification failed', err);
        toast.error('We could not verify that purchase. Contact support if you were charged.');
      } finally {
        if (mounted.current) setPurchasing(null);
      }
    });

    const failed = onPurchaseError((err) => {
      if (mounted.current) setPurchasing(null);
      // A user-cancelled flow is a normal outcome, not an error to shout about.
      const cancelled = /cancel/i.test(err.message ?? '') || err.code === 'user-cancelled';
      if (!cancelled) {
        toast.error(err.message || 'The purchase could not be completed.');
        void track({
          name: 'purchase_failed',
          params: { product_id: '', reason: err.code ?? 'unknown' },
        });
      }
    });

    return () => {
      updated.remove();
      failed.remove();
    };
  }, [refreshClaims]);

  const purchase = useCallback(async (offer: PlanOffer) => {
    setPurchasing(offer.productId);
    void track({ name: 'purchase_started', params: { product_id: offer.productId } });
    try {
      await buy(offer.productId);
      // Demo mode grants the entitlement inline; live mode resolves in the
      // purchaseUpdated listener once the store confirms.
      if (DEMO_MODE) {
        setPurchasing(null);
        void track({ name: 'purchase_completed', params: { product_id: offer.productId } });
        toast.success('Premium unlocked (demo).');
      }
    } catch (err) {
      setPurchasing(null);
      toast.error(toAppError(err).message);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    setRestoring(true);
    try {
      const count = await restore();
      await refreshClaims();
      void track({ name: 'purchases_restored' });
      toast.success(count > 0 ? 'Purchases restored.' : 'No previous purchases found.');
    } catch (err) {
      toast.error(toAppError(err).message);
    } finally {
      setRestoring(false);
    }
  }, [refreshClaims]);

  return {
    offers,
    subscription,
    loading,
    purchasing,
    restoring,
    error,
    storeUnavailable,
    purchase,
    restorePurchases,
    retry: load,
  };
}
