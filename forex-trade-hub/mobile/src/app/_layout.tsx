import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../theme/ThemeProvider';
import { ToastHost } from '../components/ui/ToastHost';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import {
  configureChannels,
  onForegroundMessage,
  onNotificationTapped,
  onLocalNotificationTapped,
  initialRoute,
  registerDevice,
  syncTopics,
  onTokenRotated,
} from '../services/push';
import { registerPushToken } from '../services/firebase/callables';
import { Platform } from 'react-native';
import { log } from '../utils/logger';
import { DEMO_MODE } from '../config/demo';

// Keep the native splash up until fonts and the first auth callback are ready,
// so the app never flashes an unstyled or logged-out frame.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  const start = useAuthStore((s) => s.start);
  const initialized = useAuthStore((s) => s.initialized);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  useEffect(() => {
    const stop = start();
    return stop;
  }, [start]);

  useEffect(() => {
    if (DEMO_MODE) return;
    void configureChannels();
  }, []);

  const ready = (fontsLoaded || !!fontError) && initialized && settingsHydrated;

  const onLayout = useCallback(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayout}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Inside the theme provider: the navigator, push wiring and the toast overlay.
 */
function AppShell() {
  const theme = useTheme();
  const router = useRouter();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const plan = useAuthStore((s) => s.claims.plan);
  const [coldStartHandled, setColdStartHandled] = useState(false);

  // Register this device and keep topic membership in step with the plan.
  useEffect(() => {
    // Demo builds ship without a Firebase project, so there is no token to
    // register and no topic to join.
    if (DEMO_MODE || !uid) return;
    void registerDevice();
    void syncTopics(plan);

    const unsubscribeToken = onTokenRotated((token) => {
      void registerPushToken({
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      }).catch((err) => log.warn('token refresh registration failed', err));
    });

    return unsubscribeToken;
  }, [plan, uid]);

  // Foreground banners, plus deep links from taps in every app state.
  useEffect(() => {
    if (DEMO_MODE) return;
    const unsubscribeForeground = onForegroundMessage();
    const unsubscribeTapped = onNotificationTapped((route) => router.push(route as never));
    const localSubscription = onLocalNotificationTapped((route) => router.push(route as never));

    return () => {
      unsubscribeForeground();
      unsubscribeTapped();
      localSubscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (DEMO_MODE || coldStartHandled || !uid) return;
    setColdStartHandled(true);
    void initialRoute().then((route) => {
      if (route) setTimeout(() => router.push(route as never), 350);
    });
  }, [coldStartHandled, router, uid]);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="premium" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="chat" />
        <Stack.Screen name="notifications" />
      </Stack>
      <ToastHost />
    </>
  );
}
