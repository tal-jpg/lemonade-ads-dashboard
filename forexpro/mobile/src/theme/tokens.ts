/**
 * Non-colour design tokens: spacing, radii, elevation, motion.
 *
 * Spacing follows a 4pt grid. Components must compose from these values rather
 * than inventing one-off numbers, which is what keeps the app visually
 * consistent across ~40 screens.
 */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const borderWidth = {
  hairline: 1,
  thick: 1.5,
} as const;

/**
 * Elevation presets. iOS uses shadow*, Android uses elevation — both are set so
 * cards read the same on either platform.
 */
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#000000',
    shadowOpacity: 0.26,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000000',
    shadowOpacity: 0.34,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -6 },
    elevation: 16,
  },
} as const;

/**
 * Motion. Kept deliberately short — a premium product feels fast, not busy.
 */
export const duration = {
  instant: 90,
  fast: 160,
  normal: 240,
  slow: 360,
  lazy: 600,
} as const;

export const stagger = 45;

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 } as const;

/** Standard opacity applied to a pressed touchable. */
export const pressedOpacity = 0.72;

export const layout = {
  screenPadding: spacing.base,
  cardPadding: spacing.base,
  tabBarHeight: 62,
  headerHeight: 56,
  maxContentWidth: 720,
  avatarSm: 28,
  avatarMd: 40,
  avatarLg: 56,
  avatarXl: 96,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type Elevation = typeof elevation;
export type Layout = typeof layout;
