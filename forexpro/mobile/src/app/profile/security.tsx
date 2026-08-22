import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StackHeader } from '../../components/ui/StackHeader';
import { SectionHeader } from '../../components/ui/Common';
import { changePassword } from '../../services/firebase/authService';
import { validatePassword, validatePasswordConfirm, passwordStrength } from '../../utils/validate';
import { toAppError } from '../../utils/errors';
import { toast } from '../../store/uiStore';

export default function Security() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [saving, setSaving] = useState(false);

  const strength = useMemo(() => passwordStrength(next), [next]);
  const strengthColor = [
    theme.colors.loss,
    theme.colors.loss,
    theme.colors.warning,
    theme.colors.profit,
    theme.colors.primary,
  ][strength.score];

  const submit = async () => {
    const validation = {
      current: current ? undefined : 'Enter your current password',
      next: validatePassword(next) ?? undefined,
      confirm: validatePasswordConfirm(next, confirm) ?? undefined,
    };
    setErrors(validation);
    if (Object.values(validation).some(Boolean)) return;

    setSaving(true);
    try {
      await changePassword(current, next);
      toast.success('Password changed');
      router.back();
    } catch (err) {
      toast.error(toAppError(err).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title="Security" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            padding: theme.layout.screenPadding,
            paddingBottom: insets.bottom + 32,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <SectionHeader
            title="Change password"
            subtitle="You will stay signed in on this device"
          />

          <Card variant="surface">
            <View style={{ gap: theme.spacing.base }}>
              <Input
                label="Current password"
                value={current}
                onChangeText={setCurrent}
                error={errors.current}
                icon="lock-closed-outline"
                password
                autoCapitalize="none"
                textContentType="password"
              />

              <View>
                <Input
                  label="New password"
                  value={next}
                  onChangeText={setNext}
                  error={errors.next}
                  icon="key-outline"
                  password
                  autoCapitalize="none"
                  textContentType="newPassword"
                  placeholder="At least 8 characters"
                />
                {next.length > 0 && (
                  <View style={[styles.strength, { marginTop: 8 }]}>
                    <View style={styles.strengthBars}>
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor:
                                i < strength.score ? strengthColor : theme.colors.surfaceHigh,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <AppText variant="caption" tint={strengthColor}>
                      {strength.label}
                    </AppText>
                  </View>
                )}
              </View>

              <Input
                label="Confirm new password"
                value={confirm}
                onChangeText={setConfirm}
                error={errors.confirm}
                icon="shield-checkmark-outline"
                password
                autoCapitalize="none"
                onSubmitEditing={submit}
              />

              <Button label="Update password" loading={saving} onPress={submit} />
            </View>
          </Card>

          <Card variant="flat" style={{ marginTop: theme.spacing.lg }}>
            <AppText variant="caption" color="textTertiary">
              Your password is never stored by FX Pulse. Authentication is handled by Firebase
              Authentication, and all traffic is encrypted in transit.
            </AppText>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  strength: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
});
