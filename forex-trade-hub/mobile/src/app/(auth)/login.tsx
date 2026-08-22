import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { signIn } from '../../services/firebase/authService';
import { validateEmail } from '../../utils/validate';
import { toAppError } from '../../utils/errors';
import { track } from '../../services/analytics';

export default function Login() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const emailError = validateEmail(email);
    const passwordError = password ? null : 'Password is required';
    setErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
    setFormError(null);
    if (emailError || passwordError) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
      void track({ name: 'login', params: { method: 'email' } });
      // The auth listener drives navigation; no explicit push needed.
    } catch (err) {
      setFormError(toAppError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[theme.colors.primaryMuted, 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(360)}>
          <View
            style={[
              styles.logo,
              { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.lg },
            ]}
          >
            <Ionicons name="pulse" size={26} color={theme.colors.primary} />
          </View>

          <AppText variant="display" style={{ marginTop: theme.spacing.xl }}>
            Welcome back
          </AppText>
          <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
            Sign in to your trading desk.
          </AppText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).duration(360)} style={{ marginTop: theme.spacing.xxl, gap: theme.spacing.base }}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@example.com"
            returnKeyType="next"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            icon="lock-closed-outline"
            password
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            placeholder="Your password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            style={styles.forgot}
            accessibilityRole="button"
          >
            <AppText variant="captionStrong" color="primary">
              Forgot password?
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

          <Button label="Sign in" onPress={submit} loading={submitting} />
        </Animated.View>

        <View style={styles.footer}>
          <AppText variant="bodySm" color="textSecondary">
            New here?{' '}
          </AppText>
          <Pressable onPress={() => router.push('/(auth)/register')} accessibilityRole="button">
            <AppText variant="bodyStrong" color="primary">
              Create an account
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  logo: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  forgot: { alignSelf: 'flex-end' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 'auto', paddingTop: 32 },
});
