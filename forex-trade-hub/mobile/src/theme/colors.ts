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
  bg: '#121A3E',
  bgAlt: '#0E1531',
  bgGradient: ['#1D2A5C', '#121A3E', '#0A0F26'],
  surface: '#0E1531',
  surfaceAlt: '#131C41',
  surfaceHigh: '#1A2450',
  scrim: 'rgba(4, 7, 20, 0.66)',

  border: '#212C5C',
  borderStrong: '#31407E',
  divider: '#161F48',

  primary: '#3D7BFF',
  primaryDark: '#2A5FE0',
  primaryMuted: 'rgba(61, 123, 255, 0.16)',
  onPrimary: '#FFFFFF',

  secondary: '#38CFFF',
  secondaryMuted: 'rgba(56, 207, 255, 0.14)',

  profit: '#2BD97C',
  profitMuted: 'rgba(43, 217, 124, 0.14)',
  loss: '#FF4D67',
  lossMuted: 'rgba(255, 77, 103, 0.14)',
  warning: '#FFB020',
  warningMuted: 'rgba(255, 176, 32, 0.14)',
  info: '#38BDF8',
  infoMuted: 'rgba(56, 189, 248, 0.14)',
  premium: '#F5C451',
  premiumMuted: 'rgba(245, 196, 81, 0.14)',
  premiumGradient: ['#F5C451', '#C9922B'],

  textPrimary: '#F2F5FD',
  textSecondary: '#9AA7CE',
  textTertiary: '#63709F',
  textInverse: '#0A0F26',
  textDisabled: '#3A4570',

  gradientPrimary: ['#4D8DFF', '#6A5BFF'],
  gradientSurface: ['#151E47', '#0E1531'],
  gradientProfit: ['rgba(43, 217, 124, 0.20)', 'rgba(43, 217, 124, 0.02)'],
  gradientLoss: ['rgba(255, 77, 103, 0.20)', 'rgba(255, 77, 103, 0.02)'],

  skeleton: '#131C41',
  skeletonHighlight: '#1A2450',

  chartGrid: '#1C2650',
  chartLine: '#3D7BFF',
  chartFillTop: 'rgba(61, 123, 255, 0.24)',
  chartFillBottom: 'rgba(61, 123, 255, 0)',

  tabBarBg: 'rgba(9, 14, 36, 0.94)',
  tabBarBorder: '#161F48',
  tabBarActive: '#3D7BFF',
  tabBarInactive: '#63709F',
};

export const lightColors: ColorPalette = {
  bg: '#F4F7FE',
  bgAlt: '#FFFFFF',
  bgGradient: ['#F8FAFF', '#EFF4FD', '#E5EDFB'],
  surface: '#FFFFFF',
  surfaceAlt: '#EDF2FC',
  surfaceHigh: '#E2EAF9',
  scrim: 'rgba(10, 16, 38, 0.45)',

  border: '#DFE7F5',
  borderStrong: '#C3D0EA',
  divider: '#E9EFFA',

  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryMuted: 'rgba(37, 99, 235, 0.12)',
  onPrimary: '#FFFFFF',

  secondary: '#0891B2',
  secondaryMuted: 'rgba(8, 145, 178, 0.12)',

  profit: '#12A150',
  profitMuted: 'rgba(18, 161, 80, 0.12)',
  loss: '#DC2626',
  lossMuted: 'rgba(220, 38, 38, 0.10)',
  warning: '#D97706',
  warningMuted: 'rgba(217, 119, 6, 0.12)',
  info: '#0284C7',
  infoMuted: 'rgba(2, 132, 199, 0.10)',
  premium: '#B4801B',
  premiumMuted: 'rgba(224, 172, 63, 0.14)',
  premiumGradient: ['#E0AC3F', '#B4801B'],

  textPrimary: '#131A33',
  textSecondary: '#5B6784',
  textTertiary: '#8B96B3',
  textInverse: '#FFFFFF',
  textDisabled: '#BFC9DE',

  gradientPrimary: ['#3B82F6', '#6366F1'],
  gradientSurface: ['#FFFFFF', '#F2F6FD'],
  gradientProfit: ['rgba(18, 161, 80, 0.14)', 'rgba(18, 161, 80, 0.01)'],
  gradientLoss: ['rgba(220, 38, 38, 0.10)', 'rgba(220, 38, 38, 0.01)'],

  skeleton: '#E7EDF9',
  skeletonHighlight: '#F4F7FE',

  chartGrid: '#E3EAF7',
  chartLine: '#2563EB',
  chartFillTop: 'rgba(37, 99, 235, 0.16)',
  chartFillBottom: 'rgba(37, 99, 235, 0)',

  tabBarBg: 'rgba(255, 255, 255, 0.96)',
  tabBarBorder: '#DFE7F5',
  tabBarActive: '#2563EB',
  tabBarInactive: '#8B96B3',
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
