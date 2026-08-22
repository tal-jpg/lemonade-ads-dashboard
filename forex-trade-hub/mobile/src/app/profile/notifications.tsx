import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StackHeader } from '../../components/ui/StackHeader';
import { Divider, SectionHeader } from '../../components/ui/Common';
import { useAuthStore } from '../../store/authStore';
import { updateNotificationPrefs } from '../../services/firebase/userRepo';
import { hasPushPermission, requestPushPermission, registerDevice } from '../../services/push';
import { toast } from '../../store/uiStore';
import { toAppError } from '../../utils/errors';
import { defaultNotificationPrefs, type NotificationPrefs } from '../../types/models';

const GROUPS: { title: string; items: { key: keyof NotificationPrefs; label: string; hint: string }[] }[] = [
  {
    title: 'Signals',
    items: [
      { key: 'newSignal', label: 'New signals', hint: 'Every signal you have access to' },
      { key: 'premiumSignal', label: 'Premium signals', hint: 'Premium-only setups' },
      { key: 'signalUpdate', label: 'Trade updates', hint: 'Entry hit, TP hit, stop loss hit' },
    ],
  },
  {
    title: 'Content',
    items: [
      { key: 'news', label: 'Market news', hint: 'Breaking news and analysis' },
      { key: 'lessons', label: 'New lessons', hint: 'When a course or lesson is published' },
    ],
  },
  {
    title: 'Community',
    items: [
      { key: 'community', label: 'Community activity', hint: 'Mentions and replies' },
      { key: 'polls', label: 'Polls', hint: 'New daily and weekly polls' },
      { key: 'announcements', label: 'Announcements', hint: 'Messages from the admins' },
    ],
  },
  {
    title: 'Account',
    items: [
      { key: 'subscription', label: 'Subscription', hint: 'Renewals, expiry and billing issues' },
    ],
  },
];

export default function NotificationSettings() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const uid = profile?.uid;

  const [prefs, setPrefs] = useState<NotificationPrefs>(
    profile?.notificationPrefs ?? defaultNotificationPrefs,
  );
  const [granted, setGranted] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void hasPushPermission().then(setGranted);
  }, []);

  useEffect(() => {
    if (profile?.notificationPrefs) setPrefs(profile.notificationPrefs);
  }, [profile?.notificationPrefs]);

  const toggle = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!uid) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    try {
      await updateNotificationPrefs(uid, next);
    } catch (err) {
      setPrefs(prefs);
      toast.error(toAppError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const enablePush = async () => {
    const ok = await requestPushPermission();
    setGranted(ok);
    if (ok) {
      await registerDevice();
      toast.success('Notifications enabled');
    } else {
      toast.error('Enable notifications for Forex Trade Hub in your device settings.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title="Notifications" subtitle={saving ? 'Saving…' : undefined} />

      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {!granted && (
          <Card variant="surface" accentColor={theme.colors.warning}>
            <View style={styles.row}>
              <Ionicons name="notifications-off-outline" size={18} color={theme.colors.warning} />
              <AppText variant="title" style={styles.flex}>
                Notifications are off
              </AppText>
            </View>
            <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 6 }}>
              You will not receive signal alerts on this device until notifications are enabled.
            </AppText>
            <Button
              label="Enable notifications"
              size="sm"
              style={{ marginTop: theme.spacing.md }}
              onPress={enablePush}
            />
          </Card>
        )}

        {GROUPS.map((group, groupIndex) => (
          <View key={group.title} style={{ marginTop: groupIndex === 0 && granted ? 0 : theme.spacing.xl }}>
            <SectionHeader title={group.title} />
            <Card variant="surface" padded={false}>
              {group.items.map((item, index) => (
                <View key={item.key}>
                  {index > 0 && <Divider />}
                  <View style={[styles.row, { padding: theme.spacing.base }]}>
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">{item.label}</AppText>
                      <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                        {item.hint}
                      </AppText>
                    </View>
                    <Switch
                      value={prefs[item.key]}
                      onValueChange={(value) => void toggle(item.key, value)}
                      trackColor={{ true: theme.colors.primary, false: theme.colors.surfaceHigh }}
                      thumbColor={theme.colors.textPrimary}
                    />
                  </View>
                </View>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
