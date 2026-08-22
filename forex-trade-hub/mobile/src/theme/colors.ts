/**
 * Colour palette.
 *
 * Every colour used anywhere in the app resolves through this file. Screens and
 * components never hardcode a hex value — they read `useTheme().colors`, so a
 * rebrand is a single-file change and light mode stays in lockstep with dark.
 */

export type ColorPalette = {
  /** App background, the lowest layer. */
  bg: string;
  /** Slightly lifted background used for scroll containers and sheets. */
  bgAlt: string;
  /** Default card / panel surface. */
  surface: string;
  /** Surface one step up (nested cards, inputs). */
  surfaceAlt: string;
  /** Highest surface (pressed states, tooltips, menus). */
  surfaceHigh: string;
  /** Translucent overlay behind modals. */
  scrim: string;

  border: string;
  borderStrong: string;
  divider: string;

  /** Brand / primary action colour. */
  primary: string;
  primaryDark: string;
  primaryMuted: string;
  onPrimary: string;

  secondary: string;
  secondaryMuted: string;

  /** Semantic trading colours. */
  profit: string;
  profitMuted: string;
  loss: string;
  lossMuted: string;
  warning: string;
  warningMuted: string;
  info: string;
  infoMuted: string;
  /** Premium / gold accent. */
  premium: string;
  premiumMuted: string;
  premiumGradient: readonly [string, string];

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textDisabled: string;

  /** Gradients used by hero cards and CTAs. */
  gradientPrimary: readonly [string, string];
  gradientSurface: readonly [string, string];
  gradientProfit: readonly [string, string];
  gradientLoss: readonly [string, string];

  skeleton: string;
  skeletonHighlight: string;

  /** Chart-specific colours. */
  chartGrid: string;
  chartLine: string;
  chartFillTop: string;
  chartFillBottom: string;

  tabBarBg: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
};

export const darkColors: ColorPalette = {
  bg: '#0A1710',
  bgAlt: '#0D1C14',
  surface: '#122419',
  surfaceAlt: '#172C1F',
  surfaceHigh: '#1D3527',
  scrim: 'rgba(2, 10, 6, 0.66)',

  border: '#20362A',
  borderStrong: '#2E4A39',
  divider: '#182B1F',

  primary: '#2AD679',
  primaryDark: '#1EA85D',
  primaryMuted: 'rgba(42, 214, 121, 0.14)',
  onPrimary: '#04150C',

  secondary: '#3FD8B4',
  secondaryMuted: 'rgba(63, 216, 180, 0.14)',

  profit: '#2AD679',
  profitMuted: 'rgba(42, 214, 121, 0.14)',
  loss: '#F6465D',
  lossMuted: 'rgba(246, 70, 93, 0.14)',
  warning: '#F0B90B',
  warningMuted: 'rgba(240, 185, 11, 0.14)',
  info: '#38BDF8',
  infoMuted: 'rgba(56, 189, 248, 0.14)',
  premium: '#F5C451',
  premiumMuted: 'rgba(245, 196, 81, 0.14)',
  premiumGradient: ['#F5C451', '#C9922B'],

  textPrimary: '#F2F7F3',
  textSecondary: '#9DB4A6',
  textTertiary: '#66816F',
  textInverse: '#0A1710',
  textDisabled: '#3A4F42',

  gradientPrimary: ['#3AE68C', '#1FB566'],
  gradientSurface: ['#152920', '#0F2016'],
  gradientProfit: ['rgba(42, 214, 121, 0.20)', 'rgba(42, 214, 121, 0.02)'],
  gradientLoss: ['rgba(246, 70, 93, 0.20)', 'rgba(246, 70, 93, 0.02)'],

  skeleton: '#152920',
  skeletonHighlight: '#1D3527',

  chartGrid: '#1B2F23',
  chartLine: '#2AD679',
  chartFillTop: 'rgba(42, 214, 121, 0.24)',
  chartFillBottom: 'rgba(42, 214, 121, 0)',

  tabBarBg: 'rgba(8, 18, 12, 0.94)',
  tabBarBorder: '#182B1F',
  tabBarActive: '#2AD679',
  tabBarInactive: '#66816F',
};

export const lightColors: ColorPalette = {
  bg: '#F3FAF5',
  bgAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#EBF5EE',
  surfaceHigh: '#DFEEE4',
  scrim: 'rgba(8, 24, 15, 0.45)',

  border: '#DCEAE0',
  borderStrong: '#BED3C5',
  divider: '#E7F1EA',

  primary: '#0E9F58',
  primaryDark: '#0B7E46',
  primaryMuted: 'rgba(14, 159, 88, 0.12)',
  onPrimary: '#FFFFFF',

  secondary: '#0D9488',
  secondaryMuted: 'rgba(13, 148, 136, 0.12)',

  profit: '#0E9F58',
  profitMuted: 'rgba(14, 159, 88, 0.12)',
  loss: '#DC2626',
  lossMuted: 'rgba(220, 38, 38, 0.10)',
  warning: '#D97706',
  warningMuted: 'rgba(217, 119, 6, 0.12)',
  info: '#0284C7',
  infoMuted: 'rgba(2, 132, 199, 0.10)',
  premium: '#B4801B',
  premiumMuted: 'rgba(224, 172, 63, 0.14)',
  premiumGradient: ['#E0AC3F', '#B4801B'],

  textPrimary: '#122A1C',
  textSecondary: '#5A7466',
  textTertiary: '#87A093',
  textInverse: '#FFFFFF',
  textDisabled: '#BBCFC2',

  gradientPrimary: ['#16B366', '#0B8A4C'],
  gradientSurface: ['#FFFFFF', '#F1F8F3'],
  gradientProfit: ['rgba(14, 159, 88, 0.14)', 'rgba(14, 159, 88, 0.01)'],
  gradientLoss: ['rgba(220, 38, 38, 0.10)', 'rgba(220, 38, 38, 0.01)'],

  skeleton: '#E3EFE7',
  skeletonHighlight: '#F3FAF5',

  chartGrid: '#DFEDE3',
  chartLine: '#0E9F58',
  chartFillTop: 'rgba(14, 159, 88, 0.18)',
  chartFillBottom: 'rgba(14, 159, 88, 0)',

  tabBarBg: 'rgba(255, 255, 255, 0.96)',
  tabBarBorder: '#DCEAE0',
  tabBarActive: '#0E9F58',
  tabBarInactive: '#87A093',
};

/**
 * Semantic colour for a trade direction.
 */
export function directionColor(c: ColorPalette, direction: 'buy' | 'sell'): string {
  return direction === 'buy' ? c.profit : c.loss;
}

/**
 * Semantic colour for a signed change value (price move, % change, P/L).
 */
export function deltaColor(c: ColorPalette, value: number): string {
  if (value > 0) return c.profit;
  if (value < 0) return c.loss;
  return c.textSecondary;
}
