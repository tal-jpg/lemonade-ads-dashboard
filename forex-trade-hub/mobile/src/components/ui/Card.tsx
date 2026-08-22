import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';

export type CardVariant = 'surface' | 'outlined' | 'elevated' | 'gradient' | 'flat';

export type CardProps = {
  children: React.ReactNode;
  variant?: CardVariant;
  padded?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Overrides the gradient used by the `gradient` variant. */
  gradientColors?: readonly [string, string];
  accentColor?: string;
  testID?: string;
};

/**
 * The container every panel in the app is built from.
 *
 * `accentColor` draws a 3px leading bar — used to colour a card by trade
 * direction or severity without repainting the whole surface.
 */
export function Card({
  children,
  variant = 'surface',
  padded = true,
  onPress,
  style,
  gradientColors,
  accentColor,
  testID,
}: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    borderRadius: theme.radius.lg,
    padding: padded ? theme.spacing.base : 0,
    overflow: 'hidden',
  };

  const variantStyle: ViewStyle =
    variant === 'surface'
      ? {
          backgroundColor: theme.colors.surface,
          borderWidth: theme.borderWidth.hairline,
          borderColor: theme.colors.border,
        }
      : variant === 'outlined'
        ? {
            backgroundColor: 'transparent',
            borderWidth: theme.borderWidth.hairline,
            borderColor: theme.colors.border,
          }
        : variant === 'elevated'
          ? {
              backgroundColor: theme.colors.surfaceAlt,
              borderWidth: theme.borderWidth.hairline,
              borderColor: theme.colors.border,
              ...theme.elevation.card,
            }
          : variant === 'flat'
            ? { backgroundColor: theme.colors.surfaceAlt }
            : { backgroundColor: theme.colors.surface };

  const inner = (
    <>
      {variant === 'gradient' && (
        <LinearGradient
          colors={(gradientColors ?? theme.colors.gradientSurface) as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {accentColor && (
        <View style={[styles.accent, { backgroundColor: accentColor }]} pointerEvents="none" />
      )}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          base,
          variantStyle,
          pressed && { opacity: 0.85, transform: [{ scale: 0.994 }] },
          style,
        ]}
      >
        {inner}
      </Pressable>
    );
  }

  return (
    <View testID={testID} style={[base, variantStyle, style]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
