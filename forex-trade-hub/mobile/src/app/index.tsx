import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { DEMO_MODE } from '../config/demo';

/**
 * Entry route.
 *
 * The root layout has already resolved the session by the time this renders,
 * so the decision is a pure redirect with no loading state of its own.
 */
export default function Index() {
  const signedIn = useAuthStore((s) => s.firebaseUser !== null);
  const status = useAuthStore((s) => s.claims.status);
  const onboardingSeen = useSettingsStore((s) => s.onboardingSeen);

  if (!onboardingSeen) return <Redirect href="/(auth)/onboarding" />;
  // A demo build is always "signed in" as the sample account.
  if (!signedIn && !DEMO_MODE) return <Redirect href="/(auth)/login" />;
  // A banned account is signed in but has nowhere to go; the profile tab shows
  // the account status and support contact.
  if (status === 'banned') return <Redirect href="/(tabs)/profile" />;

  return <Redirect href="/(tabs)" />;
}
