import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StackHeader } from '../../components/ui/StackHeader';
import { reauthenticate, signOut } from '../../services/firebase/authService';
import { deleteAccount } from '../../services/firebase/callables';
import { unregisterDevice, leaveAllTopics } from '../../services/push';
import { useIsPremium } from '../../store/authStore';
import { toAppError } from '../../utils/errors';
import { toast } from '../../store/uiStore';

const REMOVED = [
  'Your profile, username and contact details',
  'Your community membership and message history',
  'Your lesson progress and quiz results',
  'Your notification settings and devices',
];

/**
 * Account deletion.
 *
 * Required by both stores for any app with account creation. The destructive
 * work happens in the `deleteAccount` Cloud Function — the client only
 * re-authenticates and confirms intent.
 */
export default function DeleteAccount() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isPremium = useIsPremium();

  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = password.length > 0 && confirmText.trim().toUpperCase() === 'DELETE' && acknowledged;

  const submit = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      // Firebase requires a recent login before a destructive account change.
      await reauthenticate(password);
      await unregisterDevice();
      await leaveAllTopics();
      await deleteAccount({ reason: 'user_requested' });
      toast.success('Your account has been deleted.');
      await signOut();
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title="Delete account" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            padding: theme.layout.screenPadding,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="surface" accentColor={theme.colors.loss}>
            <View style={styles.row}>
              <Ionicons name="trash-outline" size={20} color={theme.colors.loss} />
              <AppText variant="title" style={styles.flex}>
                This cannot be undone
              </AppText>
            </View>
            <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 8 }}>
              Deleting your account permanently removes:
            </AppText>
            <View style={{ marginTop: theme.spacing.md, gap: 8 }}>
              {REMOVED.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <Ionicons name="close-circle-outline" size={15} color={theme.colors.loss} />
                  <AppText variant="bodySm" color="textSecondary" style={styles.flex}>
                    {item}
                  </AppText>
                </View>
              ))}
            </View>
          </Card>

          {isPremium && (
            <Card variant="surface" accentColor={theme.colors.warning} style={{ marginTop: theme.spacing.base }}>
              <View style={styles.row}>
                <Ionicons name="card-outline" size={18} color={theme.colors.warning} />
                <AppText variant="bodyStrong" style={styles.flex}>
                  You have an active subscription
                </AppText>
              </View>
              <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 6 }}>
                Deleting your account does not cancel billing. Cancel your subscription in your
                device's store settings first, or you will continue to be charged.
              </AppText>
            </Card>
          )}

          <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.base }}>
            <Input
              label="Confirm your password"
              value={password}
              onChangeText={setPassword}
              icon="lock-closed-outline"
              password
              autoCapitalize="none"
            />

            <Input
              label="Type DELETE to confirm"
              value={confirmText}
              onChangeText={setConfirmText}
              icon="warning-outline"
              autoCapitalize="characters"
              placeholder="DELETE"
            />

            <Pressable
              onPress={() => setAcknowledged((v) => !v)}
              style={styles.ack}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acknowledged }}
            >
              <Ionicons
                name={acknowledged ? 'checkbox' : 'square-outline'}
                size={20}
                color={acknowledged ? theme.colors.loss : theme.colors.textTertiary}
              />
              <AppText variant="bodySm" color="textSecondary" style={styles.flex}>
                I understand that my account and all associated data will be permanently deleted.
              </AppText>
            </Pressable>

            {error && (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: theme.colors.lossMuted, borderRadius: theme.radius.sm },
                ]}
              >
                <Ionicons name="alert-circle" size={16} color={theme.colors.loss} />
                <AppText variant="bodySm" color="loss" style={styles.flex}>
                  {error}
                </AppText>
              </View>
            )}

            <Button
              label="Permanently delete my account"
              variant="danger"
              disabled={!canDelete}
              loading={deleting}
              onPress={submit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ack: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
});
