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
      // Lifted a step and outlined in the accent so it reads as a control,
      // not as a patch of background.
      bg: theme.colors.surfaceHigh,
      fg: theme.colors.textPrimary,
      border: theme.colors.borderStrong,
    },
    ghost: { bg: 'transparent', fg: theme.colors.textPrimary, border: 'transparent' },
    // A deeper red than the semantic `loss` token: the bright one is tuned to
    // read as text on a dark surface, where it only reaches 3.8:1 behind a
    // white label. This fill clears 4.8:1.
    danger: { bg: '#DC2626', fg: '#FFFFFF', border: 'transparent' },
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
          borderRadius: theme.radius.sm,
          paddingHorizontal: size === 'sm' ? theme.spacing.base : theme.spacing.lg,
          opacity: isDisabled ? 0.45 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.978 : 1 }],
        },
        fullWidth && styles.fullWidth,
        !useGradient && {
          backgroundColor: palette.bg,
          borderWidth: variant === 'secondary' ? theme.borderWidth.thick : 0,
          borderColor: palette.border,
        },
        // Filled buttons sit above the surface; ghost stays flat.
        variant !== 'ghost' && !isDisabled && theme.elevation.card,
        style,
      ]}
    >
      {useGradient ? (
        <LinearGradient
          colors={gradientColors as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: theme.radius.sm }]}
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
