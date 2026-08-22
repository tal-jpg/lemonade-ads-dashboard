import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeProvider';
import { DEMO_MODE } from '../../config/demo';

/**
 * Authentication stack.
 *
 * Signed-in users are bounced straight to the app — this is the guard that
 * makes "back" from the login screen impossible after a successful sign-in.
 */
export default function AuthLayout() {
  const theme = useTheme();
  const signedIn = useAuthStore((s) => s.firebaseUser !== null);
  const profile = useAuthStore((s) => s.profile);

  // Wait for the profile before redirecting, otherwise onboarding state and the
  // home dashboard both render against a null user for a frame.
  // Onboarding must stay reachable in a demo build even though the sample
  // session is always present.
  if (signedIn && profile && !DEMO_MODE) return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bg },
        animation: 'slide_from_right',
      }}
    />
  );
}
