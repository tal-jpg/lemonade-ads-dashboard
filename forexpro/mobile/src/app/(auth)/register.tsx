import React, { useCallback, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { register, isUsernameAvailable } from '../../services/firebase/authService';
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirm,
  validatePhone,
  validateUsername,
  normaliseUsername,
  passwordStrength,
} from '../../utils/validate';
import { toAppError } from '../../utils/errors';
import { track } from '../../services/analytics';
import { useAppSettings } from '../../hooks/useAppSettings';
import * as WebBrowser from 'expo-web-browser';

type Fields = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
};

const EMPTY: Fields = { fullName: '', username: '', email: '', phone: '', password: '', confirm: '' };

export default function Register() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useAppSettings();

  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [usernameState, setUsernameState] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');

  const set = useCallback(
    <K extends keyof Fields>(key: K, value: Fields[K]) => {
      setFields((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const strength = useMemo(() => passwordStrength(fields.password), [fields.password]);

  const checkUsername = useCallback(async () => {
    const value = normaliseUsername(fields.username);
    if (validateUsername(value)) {
      setUsernameState('idle');
      return;
    }
    setUsernameState('checking');
    const available = await isUsernameAvailable(value);
    setUsernameState(available ? 'free' : 'taken');
  }, [fields.username]);

  const submit = async () => {
    const next: Partial<Record<keyof Fields, string>> = {
      fullName: validateFullName(fields.fullName) ?? undefined,
      username: validateUsername(fields.username) ?? undefined,
      email: validateEmail(fields.email) ?? undefined,
      phone: validatePhone(fields.phone) ?? undefined,
      password: validatePassword(fields.password) ?? undefined,
      confirm: validatePasswordConfirm(fields.password, fields.confirm) ?? undefined,
    };
    setErrors(next);
    setFormError(null);

    if (Object.values(next).some(Boolean)) return;
    if (!accepted) {
      setFormError('Please accept the Terms and Privacy Policy to continue.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        fullName: fields.fullName,
        username: fields.username,
        email: fields.email,
        password: fields.password,
        phone: fields.phone,
      });
      void track({ name: 'sign_up', params: { method: 'email' } });
      // The auth listener takes over from here.
    } catch (err) {
      setFormError(toAppError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  const strengthColor = [
    theme.colors.loss,
    theme.colors.loss,
    theme.colors.warning,
    theme.colors.profit,
    theme.colors.primary,
  ][strength.score];

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} hitSlop={theme.hitSlop} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textSecondary} />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(340)}>
          <AppText variant="display" style={{ marginTop: theme.spacing.base }}>
            Create account
          </AppText>
          <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
            Join the desk. Start on the free plan — upgrade whenever you like.
          </AppText>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(340)}
          style={{ marginTop: theme.spacing.xl, gap: theme.spacing.base }}
        >
          <Input
            label="Full name"
            value={fields.fullName}
            onChangeText={(v) => set('fullName', v)}
            error={errors.fullName}
            icon="person-outline"
            autoComplete="name"
            textContentType="name"
            placeholder="Alex Morgan"
          />

          <Input
            label="Username"
            value={fields.username}
            onChangeText={(v) => {
              set('username', normaliseUsername(v));
              setUsernameState('idle');
            }}
            onBlur={checkUsername}
            error={errors.username}
            helper={
              usernameState === 'free'
                ? 'That username is available'
                : usernameState === 'taken'
                  ? undefined
                  : 'Lowercase letters, numbers and underscores'
            }
            icon="at-outline"
            autoCapitalize="none"
            placeholder="alexm"
            rightAdornment={
              usernameState === 'free' ? (
                <Ionicons name="checkmark-circle" size={17} color={theme.colors.profit} />
              ) : usernameState === 'taken' ? (
                <Ionicons name="close-circle" size={17} color={theme.colors.loss} />
              ) : null
            }
          />
          {usernameState === 'taken' && (
            <AppText variant="caption" color="loss" style={{ marginTop: -10 }}>
              That username is already taken.
            </AppText>
          )}

          <Input
            label="Email"
            value={fields.email}
            onChangeText={(v) => set('email', v)}
            error={errors.email}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
          />

          <Input
            label="Phone number"
            value={fields.phone}
            onChangeText={(v) => set('phone', v)}
            error={errors.phone}
            icon="call-outline"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            placeholder="+1 555 000 1234"
          />

          <View>
            <Input
              label="Password"
              value={fields.password}
              onChangeText={(v) => set('password', v)}
              error={errors.password}
              icon="lock-closed-outline"
              password
              autoCapitalize="none"
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="At least 8 characters"
            />
            {fields.password.length > 0 && (
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
            label="Confirm password"
            value={fields.confirm}
            onChangeText={(v) => set('confirm', v)}
            error={errors.confirm}
            icon="shield-checkmark-outline"
            password
            autoCapitalize="none"
            placeholder="Repeat your password"
            onSubmitEditing={submit}
          />

          <Pressable
            onPress={() => setAccepted((v) => !v)}
            style={styles.terms}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
          >
            <Ionicons
              name={accepted ? 'checkbox' : 'square-outline'}
              size={20}
              color={accepted ? theme.colors.primary : theme.colors.textTertiary}
            />
            <AppText variant="bodySm" color="textSecondary" style={styles.flex}>
              I agree to the{' '}
              <AppText
                variant="bodySm"
                color="primary"
                onPress={() => void WebBrowser.openBrowserAsync(settings.legal.termsUrl)}
              >
                Terms &amp; Conditions
              </AppText>{' '}
              and{' '}
              <AppText
                variant="bodySm"
                color="primary"
                onPress={() => void WebBrowser.openBrowserAsync(settings.legal.privacyUrl)}
              >
                Privacy Policy
              </AppText>
              . I understand trading carries risk and no profit is guaranteed.
            </AppText>
          </Pressable>

          {formError && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: theme.colors.lossMuted, borderRadius: theme.radius.sm },
              ]}
            >
              <Ionicons name="alert-circle" size={16} color={theme.colors.loss} />
              <AppText variant="bodySm" color="loss" style={styles.flex}>
                {formError}
              </AppText>
            </View>
          )}

          <Button label="Create account" onPress={submit} loading={submitting} />
        </Animated.View>

        <View style={styles.footer}>
          <AppText variant="bodySm" color="textSecondary">
            Already registered?{' '}
          </AppText>
          <Pressable onPress={() => router.replace('/(auth)/login')} accessibilityRole="button">
            <AppText variant="bodyStrong" color="primary">
              Sign in
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  back: { alignSelf: 'flex-start' },
  strength: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  terms: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 28 },
});
