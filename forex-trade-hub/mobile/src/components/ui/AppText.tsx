import React from 'react';
import { Text, TextProps, TextStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { TypographyVariant } from '../../theme/typography';
import type { ColorPalette } from '../../theme/colors';

type ColorToken = keyof Pick<
  ColorPalette,
  | 'textPrimary'
  | 'textSecondary'
  | 'textTertiary'
  | 'textInverse'
  | 'textDisabled'
  | 'primary'
  | 'secondary'
  | 'profit'
  | 'loss'
  | 'warning'
  | 'info'
  | 'premium'
  | 'onPrimary'
>;

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  /** Escape hatch for a computed colour (e.g. direction-dependent). */
  tint?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
};

/**
 * The only text primitive in the app.
 *
 * Screens never set fontSize or fontFamily directly — they pick a variant, so
 * the type scale stays consistent and a single edit restyles everything.
 */
export function AppText({
  variant = 'body',
  color = 'textPrimary',
  tint,
  center,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      style={[
        theme.typography[variant],
        { color: tint ?? theme.colors[color] },
        center && { textAlign: 'center' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
