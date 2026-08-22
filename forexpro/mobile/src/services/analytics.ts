import { getAnalytics, logEvent, logScreenView, setUserId, setUserProperty } from '@react-native-firebase/analytics';
import { getApp } from '@react-native-firebase/app';
import { log } from '../utils/logger';

/**
 * Product analytics.
 *
 * A thin, typed wrapper so event names are declared once and never drift, and
 * so a failure in analytics can never break a user flow.
 */

export type AnalyticsEvent =
  | { name: 'sign_up'; params: { method: 'email' } }
  | { name: 'login'; params: { method: 'email' } }
  | { name: 'onboarding_complete'; params?: Record<string, never> }
  | { name: 'signal_viewed'; params: { signal_id: string; is_premium: boolean; pair: string } }
  | { name: 'signal_level_copied'; params: { signal_id: string; field: string } }
  | { name: 'paywall_viewed'; params: { source: string } }
  | { name: 'plan_selected'; params: { plan: string } }
  | { name: 'purchase_started'; params: { product_id: string } }
  | { name: 'purchase_completed'; params: { product_id: string } }
  | { name: 'purchase_failed'; params: { product_id: string; reason: string } }
  | { name: 'purchases_restored'; params?: Record<string, never> }
  | { name: 'community_join_requested'; params?: Record<string, never> }
  | { name: 'message_sent'; params: { type: string } }
  | { name: 'poll_voted'; params: { poll_id: string } }
  | { name: 'lesson_completed'; params: { course_id: string; lesson_id: string } }
  | { name: 'news_opened'; params: { article_id: string; category: string } }
  | { name: 'premium_content_locked'; params: { content_type: string } };

function analytics() {
  return getAnalytics(getApp());
}

export async function track(event: AnalyticsEvent): Promise<void> {
  try {
    // `sign_up` and `login` are reserved GA4 names with their own typed
    // overloads; the wrapper deliberately funnels every event through one call
    // site, so the name is widened here.
    const send = logEvent as (
      instance: ReturnType<typeof analytics>,
      name: string,
      params?: object,
    ) => Promise<void>;
    await send(analytics(), event.name, (event as { params?: object }).params ?? {});
  } catch (err) {
    log.warn(`analytics event failed: ${event.name}`, err);
  }
}

export async function trackScreen(screenName: string, screenClass?: string): Promise<void> {
  try {
    await logScreenView(analytics(), {
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  } catch {
    // Never surface analytics failures.
  }
}

export async function identify(uid: string | null, plan?: string, role?: string): Promise<void> {
  try {
    await setUserId(analytics(), uid);
    if (plan) await setUserProperty(analytics(), 'plan', plan);
    if (role) await setUserProperty(analytics(), 'role', role);
  } catch {
    // Ignore.
  }
}
