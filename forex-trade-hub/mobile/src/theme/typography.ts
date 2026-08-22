import { TextStyle } from 'react-native';

/**
 * Typography.
 *
 * Two families, chosen for a fintech register:
 *  - Inter for UI text (excellent at small sizes, neutral, professional)
 *  - JetBrains Mono for prices, pips and any tabular number, so digits align
 *    in columns and a price never jitters as it ticks.
 *
 * Both are bundled with the binary (see @expo-google-fonts/*), so there is no
 * runtime font fetch and no flash of unstyled text offline.
 */

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export type TypographyVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title'
  | 'subtitle'
  | 'body'
  | 'bodyStrong'
  | 'bodySm'
  | 'caption'
  | 'captionStrong'
  | 'overline'
  | 'button'
  | 'price'
  | 'priceLg'
  | 'priceSm'
  | 'mono';

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontFamily: fontFamily.bold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  h1: { fontFamily: fontFamily.bold, fontSize: 27, lineHeight: 33, letterSpacing: -0.4 },
  h2: { fontFamily: fontFamily.semibold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontFamily: fontFamily.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  title: { fontFamily: fontFamily.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  subtitle: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: fontFamily.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fontFamily.medium, fontSize: 15, lineHeight: 22 },
  bodySm: { fontFamily: fontFamily.regular, fontSize: 13.5, lineHeight: 20 },
  caption: { fontFamily: fontFamily.regular, fontSize: 12, lineHeight: 16 },
  captionStrong: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  button: { fontFamily: fontFamily.bold, fontSize: 15, lineHeight: 20, letterSpacing: 0.2 },

  // Numeric styles — always monospaced so columns line up.
  priceLg: { fontFamily: fontFamily.monoBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  price: { fontFamily: fontFamily.monoBold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  priceSm: { fontFamily: fontFamily.mono, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: fontFamily.mono, fontSize: 12, lineHeight: 16 },
};

/**
 * Font assets to preload at boot. Kept next to the definitions so adding a
 * weight can never be half-done.
 */
export const fontsToLoad = [
  'Inter_400Regular',
  'Inter_500Medium',
  'Inter_600SemiBold',
  'Inter_700Bold',
  'JetBrainsMono_500Medium',
  'JetBrainsMono_700Bold',
] as const;
