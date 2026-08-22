import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeMode, ResolvedScheme, themeFor } from './theme';
import { useSettingsStore } from '../store/settingsStore';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode = useSettingsStore((s) => s.themeMode);
  const setMode = useSettingsStore((s) => s.setThemeMode);

  const value = useMemo<ThemeContextValue>(() => {
    // Light is the product's default: when the OS reports nothing, we stay
    // light rather than flashing a dark screen.
    const resolved: ResolvedScheme =
      mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
    return { theme: themeFor(resolved), mode, setMode };
  }, [mode, setMode, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx.theme;
}

export function useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void } {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used inside <ThemeProvider>');
  return { mode: ctx.mode, setMode: ctx.setMode };
}

/**
 * Builds a memoised StyleSheet from the active theme.
 *
 *   const styles = useStyles(({ colors, spacing }) => ({
 *     root: { backgroundColor: colors.surface, padding: spacing.base },
 *   }));
 *
 * The factory re-runs only when the theme object changes (i.e. on a real theme
 * switch), so styles are not rebuilt on every render.
 */
export function useStyles<T extends Record<string, unknown>>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [theme]); // eslint-disable-line react-hooks/exhaustive-deps
}
