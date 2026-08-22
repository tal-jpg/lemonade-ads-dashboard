import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Atmospheric lighting behind a screen.
 *
 * Two very low-opacity radial washes — cyan high-right, violet mid-left —
 * that give the dark navy ground depth without reading as neon glow. Purely
 * decorative, so it never intercepts touches.
 */
export function AmbientGlow() {
  const theme = useTheme();
  if (!theme.isDark) return null;

  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="glowCyan" cx="75%" cy="18%" r="55%">
          <Stop offset="0" stopColor="#00B8E6" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#00B8E6" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="glowViolet" cx="18%" cy="32%" r="55%">
          <Stop offset="0" stopColor="#6C3BFF" stopOpacity={0.12} />
          <Stop offset="1" stopColor="#6C3BFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowCyan)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowViolet)" />
    </Svg>
  );
}
