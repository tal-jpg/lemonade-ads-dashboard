import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';
import { useAppSettings } from '../../hooks/useAppSettings';

/**
 * Risk disclaimer.
 *
 * Required on every surface that shows a signal, a result or a performance
 * figure. The copy comes from remote settings so legal can update it without a
 * release; the fallback in models.ts is always a complete, compliant sentence.
 */

export function RiskDisclaimer({
  compact = false,
  style,
}: {
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const settings = useAppSettings();

  if (compact) {
    return (
      <AppText variant="caption" color="textTertiary" style={[styles.compact, style]}>
        Educational content only. Trading carries risk; no profit is guaranteed.
      </AppText>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
        },
        style,
      ]}
    >
      <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
      <AppText variant="caption" color="textTertiary" style={styles.body}>
        {settings.legal.riskDisclaimer}
      </AppText>
    </View>
  );
}

/** Shown next to any historical win-rate or performance number. */
export function PerformanceDisclaimer({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <AppText variant="caption" color="textTertiary" style={[styles.compact, style]}>
      Past performance does not guarantee future results.
    </AppText>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 10, borderWidth: StyleSheet.hairlineWidth },
  body: { flex: 1, lineHeight: 17 },
  compact: { lineHeight: 16 },
});
