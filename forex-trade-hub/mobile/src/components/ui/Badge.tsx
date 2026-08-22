import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';
import type { Confidence, SignalDirection, TradeState, UserRole } from '../../types/models';

export type BadgeTone = 'neutral' | 'primary' | 'profit' | 'loss' | 'warning' | 'info' | 'premium';

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Solid badges are used for the single most important state on a card. */
  solid?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Badge({ label, tone = 'neutral', icon, solid = false, style }: BadgeProps) {
  const theme = useTheme();

  const map: Record<BadgeTone, { fg: string; bg: string }> = {
    neutral: { fg: theme.colors.textSecondary, bg: theme.colors.surfaceHigh },
    primary: { fg: theme.colors.primary, bg: theme.colors.primaryMuted },
    profit: { fg: theme.colors.profit, bg: theme.colors.profitMuted },
    loss: { fg: theme.colors.loss, bg: theme.colors.lossMuted },
    warning: { fg: theme.colors.warning, bg: theme.colors.warningMuted },
    info: { fg: theme.colors.info, bg: theme.colors.infoMuted },
    premium: { fg: theme.colors.premium, bg: theme.colors.premiumMuted },
  };

  const { fg, bg } = map[tone];
  const foreground = solid
    ? tone === 'neutral'
      ? theme.colors.textPrimary
      : theme.isDark
        ? '#0A0F26'
        : '#FFFFFF'
    : fg;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: solid ? fg : bg,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.sm,
        },
        style,
      ]}
    >
      {icon && <Ionicons name={icon} size={11} color={foreground} />}
      <AppText variant="overline" tint={foreground}>
        {label}
      </AppText>
    </View>
  );
}

// ------------------------------------------------------- domain-aware badges

export function DirectionBadge({ direction, solid = true }: { direction: SignalDirection; solid?: boolean }) {
  return (
    <Badge
      label={direction === 'buy' ? 'BUY' : 'SELL'}
      tone={direction === 'buy' ? 'profit' : 'loss'}
      icon={direction === 'buy' ? 'trending-up' : 'trending-down'}
      solid={solid}
    />
  );
}

const TRADE_STATE_LABEL: Record<TradeState, string> = {
  pending: 'Pending',
  active: 'Active',
  tp_hit: 'TP Hit',
  sl_hit: 'SL Hit',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

const TRADE_STATE_TONE: Record<TradeState, BadgeTone> = {
  pending: 'warning',
  active: 'info',
  tp_hit: 'profit',
  sl_hit: 'loss',
  closed: 'neutral',
  cancelled: 'neutral',
};

export function TradeStateBadge({ state }: { state: TradeState }) {
  return <Badge label={TRADE_STATE_LABEL[state]} tone={TRADE_STATE_TONE[state]} />;
}

export function PremiumBadge({ label = 'Premium' }: { label?: string }) {
  return <Badge label={label} tone="premium" icon="star" />;
}

export function RoleBadge({ role }: { role: UserRole }) {
  if (role === 'admin') return <Badge label="Admin" tone="primary" icon="shield-checkmark" />;
  if (role === 'moderator') return <Badge label="Mod" tone="info" icon="shield" />;
  return null;
}

const CONFIDENCE_TONE: Record<Confidence, BadgeTone> = {
  low: 'neutral',
  medium: 'info',
  high: 'primary',
};

/**
 * Confidence is a self-assessed rating, never a probability — the label is
 * deliberately qualitative so it cannot be read as a guarantee.
 */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <Badge
      label={`${confidence} confidence`}
      tone={CONFIDENCE_TONE[confidence]}
      icon="analytics-outline"
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});
