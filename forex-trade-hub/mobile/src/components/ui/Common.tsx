import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';
import { formatPct } from '../../utils/format';

/**
 * Small shared primitives: section headers, dividers, icon buttons, rows,
 * progress bars and the change pill. Grouped in one module because each is a
 * few lines and they are almost always imported together.
 */

// ------------------------------------------------------------ section header

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionHeader, { marginBottom: theme.spacing.md }, style]}>
      <View style={styles.flex}>
        <AppText variant="h3">{title}</AppText>
        {subtitle && (
          <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        )}
      </View>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={theme.hitSlop} accessibilityRole="button">
          <View style={styles.actionRow}>
            <AppText variant="captionStrong" color="primary">
              {actionLabel}
            </AppText>
            <Ionicons name="chevron-forward" size={13} color={theme.colors.primary} />
          </View>
        </Pressable>
      )}
    </View>
  );
}

// ------------------------------------------------------------------ divider

export function Divider({ spacing = 0, style }: { spacing?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider, marginVertical: spacing },
        style,
      ]}
    />
  );
}

// -------------------------------------------------------------- icon button

export function IconButton({
  icon,
  onPress,
  size = 20,
  color,
  badge,
  variant = 'plain',
  accessibilityLabel,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  /** Numeric badge, e.g. unread notifications. */
  badge?: number;
  variant?: 'plain' | 'surface';
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={theme.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        variant === 'surface' && {
          width: 40,
          height: 40,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: theme.borderWidth.hairline,
          borderColor: theme.colors.border,
        },
        styles.iconButton,
        pressed && { opacity: 0.6 },
        style,
      ]}
    >
      <Ionicons name={icon} size={size} color={color ?? theme.colors.textSecondary} />
      {badge !== undefined && badge > 0 && (
        <View style={[styles.badgeDot, { backgroundColor: theme.colors.loss, borderColor: theme.colors.bg }]}>
          <AppText variant="overline" tint="#FFFFFF" style={styles.badgeText}>
            {badge > 99 ? '99+' : String(badge)}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

// ------------------------------------------------------------- progress bar

export function ProgressBar({
  /** 0..100 */
  value,
  height = 6,
  color,
  trackColor,
  style,
}: {
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped) }}
      style={[
        { height, borderRadius: height / 2, backgroundColor: trackColor ?? theme.colors.surfaceHigh, overflow: 'hidden' },
        style,
      ]}
    >
      <View
        style={{
          width: `${clamped}%`,
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: color ?? theme.colors.primary,
        }}
      />
    </View>
  );
}

// --------------------------------------------------------------- trend pill

/**
 * Signed percentage with an arrow. Green for up, red for down — plus the arrow
 * glyph, so the direction is legible without relying on colour.
 */
export function TrendPill({ value, compact }: { value: number; compact?: boolean }) {
  const theme = useTheme();
  const up = value > 0;
  const flat = value === 0;
  const tint = flat ? theme.colors.textSecondary : up ? theme.colors.profit : theme.colors.loss;
  const bg = flat
    ? theme.colors.surfaceHigh
    : up
      ? theme.colors.profitMuted
      : theme.colors.lossMuted;

  return (
    <View
      style={[
        styles.trend,
        { backgroundColor: bg, borderRadius: theme.radius.xs, paddingHorizontal: compact ? 5 : 7 },
      ]}
    >
      {!flat && (
        <Ionicons name={up ? 'caret-up' : 'caret-down'} size={compact ? 9 : 11} color={tint} />
      )}
      <AppText variant={compact ? 'overline' : 'captionStrong'} tint={tint}>
        {formatPct(value)}
      </AppText>
    </View>
  );
}

// ------------------------------------------------------------------ key row

/** Label/value row used in detail screens and settings. */
export function DetailRow({
  label,
  value,
  valueColor,
  mono,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();
  const body = (
    <View style={[styles.detailRow, { paddingVertical: theme.spacing.md }]}>
      <View style={styles.detailLabel}>
        {icon && <Ionicons name={icon} size={16} color={theme.colors.textTertiary} />}
        <AppText variant="bodySm" color="textSecondary">
          {label}
        </AppText>
      </View>
      <View style={styles.actionRow}>
        <AppText variant={mono ? 'price' : 'bodyStrong'} tint={valueColor}>
          {value}
        </AppText>
        {onPress && <Ionicons name="chevron-forward" size={15} color={theme.colors.textTertiary} />}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }
  return body;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { letterSpacing: 0 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 3, alignSelf: 'flex-start' },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
