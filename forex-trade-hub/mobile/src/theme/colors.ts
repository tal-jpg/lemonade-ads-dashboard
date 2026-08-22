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
  bg: '#0B1220',
  bgAlt: '#0F172A',
  surface: '#172033',
  surfaceAlt: '#1E293B',
  surfaceHigh: '#27344A',
  scrim: 'rgba(2, 6, 16, 0.60)',

  border: '#27344A',
  borderStrong: '#3A4A64',
  divider: '#1E293B',

  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryMuted: 'rgba(99, 102, 241, 0.16)',
  onPrimary: '#FFFFFF',

  secondary: '#22D3EE',
  secondaryMuted: 'rgba(34, 211, 238, 0.14)',

  profit: '#34D399',
  profitMuted: 'rgba(52, 211, 153, 0.14)',
  loss: '#F87171',
  lossMuted: 'rgba(248, 113, 113, 0.14)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.14)',
  info: '#38BDF8',
  infoMuted: 'rgba(56, 189, 248, 0.14)',
  premium: '#F5C451',
  premiumMuted: 'rgba(245, 196, 81, 0.14)',
  premiumGradient: ['#F5C451', '#C9922B'],

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0B1220',
  textDisabled: '#3E4C63',

  gradientPrimary: ['#6366F1', '#4F46E5'],
  gradientSurface: ['#1B2537', '#131C2C'],
  gradientProfit: ['rgba(52, 211, 153, 0.20)', 'rgba(52, 211, 153, 0.02)'],
  gradientLoss: ['rgba(248, 113, 113, 0.20)', 'rgba(248, 113, 113, 0.02)'],

  skeleton: '#1E293B',
  skeletonHighlight: '#27344A',

  chartGrid: '#1E293B',
  chartLine: '#6366F1',
  chartFillTop: 'rgba(99, 102, 241, 0.24)',
  chartFillBottom: 'rgba(99, 102, 241, 0)',

  tabBarBg: 'rgba(11, 18, 32, 0.94)',
  tabBarBorder: '#1E293B',
  tabBarActive: '#6366F1',
  tabBarInactive: '#64748B',
};

export const lightColors: ColorPalette = {
  bg: '#F5F7FB',
  bgAlt: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4F9',
  surfaceHigh: '#E8EDF5',
  scrim: 'rgba(15, 23, 42, 0.45)',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  divider: '#EDF1F7',

  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryMuted: 'rgba(79, 70, 229, 0.10)',
  onPrimary: '#FFFFFF',

  secondary: '#06B6D4',
  secondaryMuted: 'rgba(6, 182, 212, 0.12)',

  profit: '#059669',
  profitMuted: 'rgba(16, 185, 129, 0.12)',
  loss: '#DC2626',
  lossMuted: 'rgba(220, 38, 38, 0.10)',
  warning: '#D97706',
  warningMuted: 'rgba(217, 119, 6, 0.12)',
  info: '#0891B2',
  infoMuted: 'rgba(8, 145, 178, 0.10)',
  premium: '#B45309',
  premiumMuted: 'rgba(245, 158, 11, 0.14)',
  premiumGradient: ['#F59E0B', '#D97706'],

  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',
  textDisabled: '#CBD5E1',

  gradientPrimary: ['#6366F1', '#4F46E5'],
  gradientSurface: ['#FFFFFF', '#F5F7FB'],
  gradientProfit: ['rgba(5, 150, 105, 0.12)', 'rgba(5, 150, 105, 0.01)'],
  gradientLoss: ['rgba(220, 38, 38, 0.10)', 'rgba(220, 38, 38, 0.01)'],

  skeleton: '#E8EDF5',
  skeletonHighlight: '#F5F7FB',

  chartGrid: '#E2E8F0',
  chartLine: '#4F46E5',
  chartFillTop: 'rgba(79, 70, 229, 0.16)',
  chartFillBottom: 'rgba(79, 70, 229, 0)',

  tabBarBg: 'rgba(255, 255, 255, 0.96)',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#4F46E5',
  tabBarInactive: '#94A3B8',
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
