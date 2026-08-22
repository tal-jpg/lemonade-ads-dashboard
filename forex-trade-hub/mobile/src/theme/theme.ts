import { ColorPalette, darkColors, lightColors } from './colors';
import { typography, fontFamily } from './typography';
import { spacing, radius, elevation, duration, layout, borderWidth, hitSlop } from './tokens';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedScheme = 'dark' | 'light';

export type Theme = {
  scheme: ResolvedScheme;
  isDark: boolean;
  colors: ColorPalette;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  duration: typeof duration;
  layout: typeof layout;
  borderWidth: typeof borderWidth;
  hitSlop: typeof hitSlop;
};

function build(scheme: ResolvedScheme, colors: ColorPalette): Theme {
  return {
    scheme,
    isDark: scheme === 'dark',
    colors,
    typography,
    fontFamily,
    spacing,
    radius,
    elevation,
    duration,
    layout,
    borderWidth,
    hitSlop,
  };
}

export const darkTheme = build('dark', darkColors);
export const lightTheme = build('light', lightColors);

export function themeFor(scheme: ResolvedScheme): Theme {
  return scheme === 'dark' ? darkTheme : lightTheme;
}
