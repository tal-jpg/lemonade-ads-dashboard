import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';
import { useSettingsStore } from '../../store/settingsStore';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'premium';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const HEIGHTS: Record<ButtonSize, number> = { sm: 38, md: 48, lg: 54 };

/**
 * Primary action control.
 *
 * Presses give haptic feedback (respecting the user's setting) and a subtle
 * scale — the micro-interaction that makes the app feel responsive rather than
 * merely functional.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  icon,
  iconPosition = 'left',
  style,
  testID,
}: ButtonProps) {
  const theme = useTheme();
  const hapticsEnabled = useSettingsStore((s) => s.hapticsEnabled);
  const isDisabled = disabled || loading;

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [hapticsEnabled, isDisabled, onPress]);

  const height = HEIGHTS[size];
  const textVariant = size === 'sm' ? 'captionStrong' : 'button';

  const palette = {
    primary: { bg: theme.colors.primary, fg: theme.colors.onPrimary, border: 'transparent' },
    secondary: {
      bg: theme.colors.surfaceAlt,
      fg: theme.colors.textPrimary,
      border: theme.colors.border,
    },
    ghost: { bg: 'transparent', fg: theme.colors.textSecondary, border: 'transparent' },
    danger: { bg: theme.colors.loss, fg: '#FFFFFF', border: 'transparent' },
    premium: { bg: theme.colors.premium, fg: '#1A1200', border: 'transparent' },
  }[variant];

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <View style={styles.row}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={palette.fg} />
          )}
          <AppText variant={textVariant} tint={palette.fg}>
            {label}
          </AppText>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={size === 'sm' ? 15 : 18} color={palette.fg} />
          )}
        </View>
      )}
    </>
  );

  const useGradient = variant === 'primary' || variant === 'premium';
  const gradientColors =
    variant === 'premium' ? theme.colors.premiumGradient : theme.colors.gradientPrimary;

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderRadius: theme.radius.pill,
          paddingHorizontal: size === 'sm' ? theme.spacing.base : theme.spacing.lg,
          opacity: isDisabled ? 0.45 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.978 : 1 }],
        },
        fullWidth && styles.fullWidth,
        !useGradient && {
          backgroundColor: palette.bg,
          borderWidth: variant === 'secondary' ? theme.borderWidth.hairline : 0,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      {useGradient ? (
        <LinearGradient
          colors={gradientColors as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.pill }]}
        />
      ) : null}
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
