import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '../theme/theme';

/**
 * Device-local preferences.
 *
 * Persisted so the app opens in the right theme with no flash, before any
 * network call. Preferences that must follow the account (notification
 * channels) live on the user document instead.
 */

type SettingsState = {
  themeMode: ThemeMode;
  hapticsEnabled: boolean;
  /** Onboarding is per-device: a reinstall shows it again, a relaunch does not. */
  onboardingSeen: boolean;
  /** Set once the user has been asked for notification permission. */
  pushPromptShown: boolean;
  hydrated: boolean;

  setThemeMode: (mode: ThemeMode) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setOnboardingSeen: (seen: boolean) => void;
  setPushPromptShown: (shown: boolean) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'dark',
      hapticsEnabled: true,
      onboardingSeen: false,
      pushPromptShown: false,
      hydrated: false,

      setThemeMode: (themeMode) => set({ themeMode }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setOnboardingSeen: (onboardingSeen) => set({ onboardingSeen }),
      setPushPromptShown: (pushPromptShown) => set({ pushPromptShown }),
    }),
    {
      name: 'fxpulse.settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        hapticsEnabled: state.hapticsEnabled,
        onboardingSeen: state.onboardingSeen,
        pushPromptShown: state.pushPromptShown,
      }),
      onRehydrateStorage: () => (state) => {
        useSettingsStore.setState({ hydrated: true });
        void state;
      },
    },
  ),
);
