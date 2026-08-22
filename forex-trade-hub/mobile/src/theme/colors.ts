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
  /** Three-stop gradient painted behind screens (rich to deep). */
  bgGradient: readonly [string, string, string];
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
  bg: '#020D1A',
  bgAlt: '#061525',
  bgGradient: ['#0C2338', '#061525', '#020D1A'],
  surface: '#0B1E31',
  surfaceAlt: '#081B2D',
  surfaceHigh: '#10263B',
  scrim: 'rgba(0, 5, 15, 0.75)',

  border: 'rgba(148, 163, 184, 0.14)',
  borderStrong: 'rgba(0, 212, 255, 0.35)',
  divider: 'rgba(148, 163, 184, 0.10)',

  primary: '#00B8E6',
  primaryDark: '#0091BA',
  primaryMuted: 'rgba(0, 184, 230, 0.14)',
  onPrimary: '#FFFFFF',

  secondary: '#8B5CF6',
  secondaryMuted: 'rgba(108, 59, 255, 0.16)',

  profit: '#22C55E',
  profitMuted: 'rgba(34, 197, 94, 0.14)',
  loss: '#EF4444',
  lossMuted: 'rgba(239, 68, 68, 0.14)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.14)',
  info: '#00D4FF',
  infoMuted: 'rgba(0, 212, 255, 0.12)',
  premium: '#FBBF24',
  premiumMuted: 'rgba(251, 191, 36, 0.14)',
  premiumGradient: ['#FBBF24', '#D9922B'],

  textPrimary: '#F8FAFC',
  textSecondary: '#A8B7C7',
  textTertiary: '#71849A',
  textInverse: '#020D1A',
  textDisabled: '#4B6075',

  gradientPrimary: ['#00D4FF', '#1688FF'],
  gradientSurface: ['#10263B', '#0B1E31'],
  gradientProfit: ['rgba(34, 197, 94, 0.20)', 'rgba(34, 197, 94, 0.02)'],
  gradientLoss: ['rgba(239, 68, 68, 0.20)', 'rgba(239, 68, 68, 0.02)'],

  skeleton: '#081B2D',
  skeletonHighlight: '#10263B',

  chartGrid: 'rgba(148, 163, 184, 0.08)',
  chartLine: '#00D4FF',
  chartFillTop: 'rgba(0, 212, 255, 0.26)',
  chartFillBottom: 'rgba(0, 212, 255, 0)',

  tabBarBg: 'rgba(3, 14, 27, 0.94)',
  tabBarBorder: 'rgba(148, 163, 184, 0.10)',
  tabBarActive: '#00D4FF',
  tabBarInactive: '#71849A',
};

export const lightColors: ColorPalette = {
  bg: '#F2F7FC',
  bgAlt: '#FFFFFF',
  bgGradient: ['#F8FBFE', '#F0F6FC', '#E6EFF8'],
  surface: '#FFFFFF',
  surfaceAlt: '#EDF3FA',
  surfaceHigh: '#E1EBF6',
  scrim: 'rgba(2, 13, 26, 0.45)',

  border: 'rgba(71, 100, 130, 0.16)',
  borderStrong: 'rgba(0, 145, 186, 0.40)',
  divider: 'rgba(71, 100, 130, 0.10)',

  primary: '#0284A8',
  primaryDark: '#026B89',
  primaryMuted: 'rgba(2, 132, 168, 0.12)',
  onPrimary: '#FFFFFF',

  secondary: '#6D3BF0',
  secondaryMuted: 'rgba(109, 59, 240, 0.12)',

  profit: '#15803D',
  profitMuted: 'rgba(21, 128, 61, 0.12)',
  loss: '#DC2626',
  lossMuted: 'rgba(220, 38, 38, 0.10)',
  warning: '#B45309',
  warningMuted: 'rgba(180, 83, 9, 0.12)',
  info: '#0369A1',
  infoMuted: 'rgba(3, 105, 161, 0.10)',
  premium: '#A16207',
  premiumMuted: 'rgba(161, 98, 7, 0.12)',
  premiumGradient: ['#D9A441', '#A16207'],

  textPrimary: '#0C1B2A',
  textSecondary: '#4D627A',
  textTertiary: '#7B8DA3',
  textInverse: '#FFFFFF',
  textDisabled: '#B3C1D1',

  gradientPrimary: ['#0BA5CE', '#1668D6'],
  gradientSurface: ['#FFFFFF', '#F2F7FC'],
  gradientProfit: ['rgba(21, 128, 61, 0.14)', 'rgba(21, 128, 61, 0.01)'],
  gradientLoss: ['rgba(220, 38, 38, 0.10)', 'rgba(220, 38, 38, 0.01)'],

  skeleton: '#E7EFF8',
  skeletonHighlight: '#F5F9FD',

  chartGrid: 'rgba(71, 100, 130, 0.12)',
  chartLine: '#0284A8',
  chartFillTop: 'rgba(2, 132, 168, 0.16)',
  chartFillBottom: 'rgba(2, 132, 168, 0)',

  tabBarBg: 'rgba(255, 255, 255, 0.96)',
  tabBarBorder: 'rgba(71, 100, 130, 0.14)',
  tabBarActive: '#0284A8',
  tabBarInactive: '#7B8DA3',
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
