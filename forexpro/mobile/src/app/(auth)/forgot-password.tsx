import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { sendPasswordReset } from '../../services/firebase/authService';
import { validateEmail } from '../../utils/validate';
import { toAppError } from '../../utils/errors';

export default function ForgotPassword() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    const emailError = validateEmail(email);
    setError(emailError);
    setFormError(null);
    if (emailError) return;

    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setFormError(toAppError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} hitSlop={theme.hitSlop} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textSecondary} />
        </Pressable>

        {sent ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.sent}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.xl },
              ]}
            >
              <Ionicons name="mail-open-outline" size={32} color={theme.colors.primary} />
            </View>
            <AppText variant="h1" center style={{ marginTop: theme.spacing.xl }}>
              Check your inbox
            </AppText>
            <AppText variant="body" color="textSecondary" center style={{ marginTop: 8, maxWidth: 320 }}>
              If an account exists for {email.trim().toLowerCase()}, we've sent a link to reset your
              password. It expires in one hour.
            </AppText>
            <Button
              label="Back to sign in"
              variant="secondary"
              style={{ marginTop: theme.spacing.xl }}
              onPress={() => router.replace('/(auth)/login')}
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(340)}>
            <AppText variant="display" style={{ marginTop: theme.spacing.base }}>
              Reset password
            </AppText>
            <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
              Enter the email on your account and we'll send you a reset link.
            </AppText>

            <View style={{ marginTop: theme.spacing.xl, gap: theme.spacing.base }}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                error={error}
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                onSubmitEditing={submit}
              />

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

              <Button label="Send reset link" onPress={submit} loading={submitting} />
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  back: { alignSelf: 'flex-start' },
  sent: { alignItems: 'center', marginTop: 60 },
  iconWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
});
