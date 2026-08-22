import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  requestPermission,
  subscribeToTopic,
  unsubscribeFromTopic,
  AuthorizationStatus,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import { registerPushToken, unregisterPushToken } from './firebase/callables';
import { log } from '../utils/logger';
import type { PlanId } from '../types/models';

/**
 * Push notifications.
 *
 * FCM (via react-native-firebase) owns the token, topics and background
 * delivery. expo-notifications owns presentation: it draws the banner while the
 * app is in the foreground and defines the Android channels. Splitting it this
 * way keeps a single token registry server-side and one consistent look on both
 * platforms.
 *
 * Topics let the backend fan out without reading every token:
 *   all        — everyone
 *   free       — free tier only
 *   premium    — premium tier only
 */

export const TOPICS = { all: 'all', free: 'free', premium: 'premium' } as const;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Android needs its channels declared before the first notification arrives. */
export async function configureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const channels: { id: string; name: string; description: string; importance: Notifications.AndroidImportance }[] = [
    {
      id: 'signals',
      name: 'Trading signals',
      description: 'New signals and updates to open trades',
      importance: Notifications.AndroidImportance.HIGH,
    },
    {
      id: 'community',
      name: 'Community',
      description: 'Announcements, polls and mentions',
      importance: Notifications.AndroidImportance.DEFAULT,
    },
    {
      id: 'content',
      name: 'News and lessons',
      description: 'Market news and new education content',
      importance: Notifications.AndroidImportance.LOW,
    },
    {
      id: 'account',
      name: 'Account',
      description: 'Subscription and account updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    },
  ];

  await Promise.all(
    channels.map((c) =>
      Notifications.setNotificationChannelAsync(c.id, {
        name: c.name,
        description: c.description,
        importance: c.importance,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: '#2AD679',
      }),
    ),
  );
}

/** Asks for permission. Returns true when notifications may be shown. */
export async function requestPushPermission(): Promise<boolean> {
  try {
    const status = await requestPermission(getMessaging(getApp()));
    const granted =
      status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;

    // Android 13+ also needs the runtime POST_NOTIFICATIONS grant, which
    // expo-notifications requests.
    if (Platform.OS === 'android') {
      const { granted: androidGranted } = await Notifications.requestPermissionsAsync();
      return granted && androidGranted;
    }
    return granted;
  } catch (err) {
    log.error('push permission request failed', err);
    return false;
  }
}

export async function hasPushPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * Registers this device with the backend. The token registry lives server-side
 * so a signed-out device stops receiving that user's notifications.
 */
export async function registerDevice(): Promise<string | null> {
  try {
    const token = await getToken(getMessaging(getApp()));
    if (!token) return null;
    await registerPushToken({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    return token;
  } catch (err) {
    log.error('failed to register push token', err);
    return null;
  }
}

export async function unregisterDevice(): Promise<void> {
  try {
    const token = await getToken(getMessaging(getApp()));
    if (token) await unregisterPushToken({ token });
  } catch (err) {
    log.warn('failed to unregister push token', err);
  }
}

/** Keeps topic membership in step with the user's tier. */
export async function syncTopics(plan: PlanId): Promise<void> {
  const messaging = getMessaging(getApp());
  try {
    await subscribeToTopic(messaging, TOPICS.all);
    if (plan === 'premium') {
      await subscribeToTopic(messaging, TOPICS.premium);
      await unsubscribeFromTopic(messaging, TOPICS.free);
    } else {
      await subscribeToTopic(messaging, TOPICS.free);
      await unsubscribeFromTopic(messaging, TOPICS.premium);
    }
  } catch (err) {
    log.warn('topic sync failed', err);
  }
}

export async function leaveAllTopics(): Promise<void> {
  const messaging = getMessaging(getApp());
  await Promise.allSettled([
    unsubscribeFromTopic(messaging, TOPICS.all),
    unsubscribeFromTopic(messaging, TOPICS.free),
    unsubscribeFromTopic(messaging, TOPICS.premium),
  ]);
}

export function onTokenRotated(handler: (token: string) => void) {
  return onTokenRefresh(getMessaging(getApp()), handler);
}

/**
 * Foreground messages. FCM does not draw a banner while the app is open, so we
 * present one locally with the same styling as a background notification.
 */
export function onForegroundMessage(
  handler?: (message: RemoteMessage) => void,
) {
  return onMessage(getMessaging(getApp()), async (message) => {
    handler?.(message);
    const title = message.notification?.title ?? (message.data?.title as string | undefined);
    const body = message.notification?.body ?? (message.data?.body as string | undefined);
    if (!title && !body) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: title ?? 'Forex Trade Hub',
        body: body ?? '',
        data: message.data ?? {},
        sound: true,
      },
      trigger: null,
      // @ts-expect-error channelId is Android-only and not in the shared type.
      channelId: (message.data?.channel as string) ?? 'signals',
    });
  });
}

/** Deep-link target carried by a notification, e.g. "/signal/abc". */
export function routeFromMessage(
  message: RemoteMessage | null | undefined,
): string | null {
  const route = message?.data?.route;
  return typeof route === 'string' && route.startsWith('/') ? route : null;
}

/** Fires when a notification is tapped while the app is backgrounded. */
export function onNotificationTapped(handler: (route: string) => void) {
  return onNotificationOpenedApp(getMessaging(getApp()), (message) => {
    const route = routeFromMessage(message);
    if (route) handler(route);
  });
}

/** The notification that cold-started the app, if any. */
export async function initialRoute(): Promise<string | null> {
  try {
    const message = await getInitialNotification(getMessaging(getApp()));
    return routeFromMessage(message);
  } catch {
    return null;
  }
}

/** Tap handling for notifications presented by expo-notifications. */
export function onLocalNotificationTapped(handler: (route: string) => void) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const route = response.notification.request.content.data?.route;
    if (typeof route === 'string' && route.startsWith('/')) handler(route);
  });
}
