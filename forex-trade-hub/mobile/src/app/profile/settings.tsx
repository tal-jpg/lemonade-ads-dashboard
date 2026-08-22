import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, useThemeMode } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { StackHeader } from '../../components/ui/StackHeader';
import { Divider, SectionHeader } from '../../components/ui/Common';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { updateThemePreference } from '../../services/firebase/userRepo';
import type { ThemeMode } from '../../theme/theme';

const MODES: { value: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { value: 'dark', label: 'Dark', icon: 'moon-outline', hint: 'Navy focus mode for night sessions' },
  { value: 'light', label: 'Light', icon: 'sunny-outline', hint: 'The default trading theme' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline', hint: 'Follow your device' },
];

/**
 * Appearance and device preferences.
 *
 * The theme is applied locally first and mirrored to the profile so it follows
 * the account onto a new device.
 */
export default function AppearanceSettings() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { mode, setMode } = useThemeMode();
  const haptics = useSettingsStore((s) => s.hapticsEnabled);
  const setHaptics = useSettingsStore((s) => s.setHapticsEnabled);
  const uid = useAuthStore((s) => s.firebaseUser?.uid);

  const choose = (next: ThemeMode) => {
    setMode(next);
    if (uid) void updateThemePreference(uid, next);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title="Appearance" />

      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingBottom: insets.bottom + 32,
        }}
      >
        <SectionHeader title="Theme" subtitle="Light is the default experience" />
        <Card variant="surface" padded={false}>
          {MODES.map((option, index) => {
            const active = mode === option.value;
            return (
              <View key={option.value}>
                {index > 0 && <Divider />}
                <Pressable
                  onPress={() => choose(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[styles.row, { padding: theme.spacing.base }]}
                >
                  <View
                    style={[
                      styles.icon,
                      {
                        backgroundColor: active ? theme.colors.primaryMuted : theme.colors.surfaceAlt,
                        borderRadius: theme.radius.sm,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={18}
                      color={active ? theme.colors.primary : theme.colors.textTertiary}
                    />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{option.label}</AppText>
                    <AppText variant="caption" color="textTertiary">
                      {option.hint}
                    </AppText>
                  </View>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </Pressable>
              </View>
            );
          })}
        </Card>

        <SectionHeader title="Feedback" style={{ marginTop: theme.spacing.xl }} />
        <Card variant="surface">
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Haptics</AppText>
              <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                Vibration feedback on buttons and actions
              </AppText>
            </View>
            <Switch
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceHigh }}
              thumbColor={theme.colors.textPrimary}
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
});
