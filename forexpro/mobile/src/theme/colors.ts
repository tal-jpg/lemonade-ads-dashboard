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
  bg: '#050505',
  bgAlt: '#0A0A0A',
  surface: '#111111',
  surfaceAlt: '#171717',
  surfaceHigh: '#1F1F1F',
  scrim: 'rgba(0, 0, 0, 0.74)',

  border: '#232323',
  borderStrong: '#3A3A3A',
  divider: '#1A1A1A',

  primary: '#C6FF3D',
  primaryDark: '#A3DC14',
  primaryMuted: 'rgba(198, 255, 61, 0.14)',
  onPrimary: '#111400',

  secondary: '#4C86FF',
  secondaryMuted: 'rgba(76, 134, 255, 0.14)',

  profit: '#26D07C',
  profitMuted: 'rgba(38, 208, 124, 0.14)',
  loss: '#FF4D5E',
  lossMuted: 'rgba(255, 77, 94, 0.14)',
  warning: '#FFB020',
  warningMuted: 'rgba(255, 176, 32, 0.14)',
  info: '#4CC9F0',
  infoMuted: 'rgba(76, 201, 240, 0.14)',
  premium: '#F5C451',
  premiumMuted: 'rgba(245, 196, 81, 0.14)',
  premiumGradient: ['#F5C451', '#C9922B'],

  textPrimary: '#F5F5F2',
  textSecondary: '#A3A3A0',
  textTertiary: '#6F6F6C',
  textInverse: '#050505',
  textDisabled: '#464644',

  gradientPrimary: ['#CFFF5E', '#A9E81C'],
  gradientSurface: ['#161616', '#0E0E0E'],
  gradientProfit: ['rgba(38, 208, 124, 0.22)', 'rgba(38, 208, 124, 0.02)'],
  gradientLoss: ['rgba(255, 77, 94, 0.22)', 'rgba(255, 77, 94, 0.02)'],

  skeleton: '#151515',
  skeletonHighlight: '#222222',

  chartGrid: '#1E1E1E',
  chartLine: '#C6FF3D',
  chartFillTop: 'rgba(198, 255, 61, 0.26)',
  chartFillBottom: 'rgba(198, 255, 61, 0)',

  tabBarBg: 'rgba(7, 7, 7, 0.94)',
  tabBarBorder: '#1C1C1C',
  tabBarActive: '#C6FF3D',
  tabBarInactive: '#6B6B6B',
};

export const lightColors: ColorPalette = {
  bg: '#F7F7F4',
  bgAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F2EC',
  surfaceHigh: '#E7E9E0',
  scrim: 'rgba(15, 17, 10, 0.42)',

  border: '#E3E5DC',
  borderStrong: '#CCCFC2',
  divider: '#EDEEE8',

  primary: '#5B8A00',
  primaryDark: '#476E00',
  primaryMuted: 'rgba(91, 138, 0, 0.12)',
  onPrimary: '#FFFFFF',

  secondary: '#2563EB',
  secondaryMuted: 'rgba(37, 99, 235, 0.10)',

  profit: '#12A150',
  profitMuted: 'rgba(18, 161, 80, 0.12)',
  loss: '#E11D48',
  lossMuted: 'rgba(225, 29, 72, 0.10)',
  warning: '#C2740A',
  warningMuted: 'rgba(194, 116, 10, 0.12)',
  info: '#0284C7',
  infoMuted: 'rgba(2, 132, 199, 0.10)',
  premium: '#B4801B',
  premiumMuted: 'rgba(180, 128, 27, 0.12)',
  premiumGradient: ['#E0AC3F', '#B4801B'],

  textPrimary: '#15160F',
  textSecondary: '#5C5E54',
  textTertiary: '#8C8E82',
  textInverse: '#FFFFFF',
  textDisabled: '#B9BAAE',

  gradientPrimary: ['#6DA300', '#4E7A00'],
  gradientSurface: ['#FFFFFF', '#F3F4EE'],
  gradientProfit: ['rgba(18, 161, 80, 0.16)', 'rgba(18, 161, 80, 0.01)'],
  gradientLoss: ['rgba(225, 29, 72, 0.16)', 'rgba(225, 29, 72, 0.01)'],

  skeleton: '#EAEBE4',
  skeletonHighlight: '#F6F7F2',

  chartGrid: '#E6E8DF',
  chartLine: '#5B8A00',
  chartFillTop: 'rgba(91, 138, 0, 0.20)',
  chartFillBottom: 'rgba(91, 138, 0, 0)',

  tabBarBg: 'rgba(255, 255, 255, 0.94)',
  tabBarBorder: '#E4E6DD',
  tabBarActive: '#5B8A00',
  tabBarInactive: '#8C8E82',
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
