import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Badge, DirectionBadge, PremiumBadge, TradeStateBadge } from '../ui/Badge';
import { directionColor } from '../../theme/colors';
import { formatPairLabel, formatPrice, formatRiskReward, formatPips } from '../../utils/format';
import { timeAgo } from '../../utils/date';
import type { Signal, SignalTeaser } from '../../types/models';

/**
 * The signal card.
 *
 * Reads top-to-bottom the way a trader scans one: pair and direction first,
 * then the three levels as a single row of monospaced figures, then state.
 */
export function SignalCard({ signal, compact = false }: { signal: Signal; compact?: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const tint = directionColor(theme.colors, signal.direction);

  const tp1 = signal.takeProfits[0];
  const closed = signal.tradeState === 'tp_hit' || signal.tradeState === 'sl_hit' || signal.tradeState === 'closed';

  return (
    <Card
      variant="surface"
      accentColor={tint}
      onPress={() => router.push(`/signal/${signal.id}`)}
      testID={`signal-card-${signal.id}`}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppText variant="h3">{formatPairLabel(signal.pair)}</AppText>
          <DirectionBadge direction={signal.direction} />
        </View>
        <View style={styles.headerRight}>
          {signal.isPremium && <PremiumBadge />}
          <TradeStateBadge state={signal.tradeState} />
        </View>
      </View>

      <View style={[styles.metaRow, { marginTop: 6 }]}>
        <AppText variant="caption" color="textTertiary">
          {signal.timeframe}
        </AppText>
        <Dot />
        <AppText variant="caption" color="textTertiary">
          {timeAgo(signal.publishedAt)}
        </AppText>
        {signal.strategy ? (
          <>
            <Dot />
            <AppText variant="caption" color="textTertiary" numberOfLines={1}>
              {signal.strategy}
            </AppText>
          </>
        ) : null}
      </View>

      {!compact && (
        <View style={[styles.levels, { marginTop: theme.spacing.base }]}>
          <Level label="Entry" value={formatPrice(signal.entry, signal.pair)} />
          <Level
            label="Stop loss"
            value={formatPrice(signal.stopLoss, signal.pair)}
            tint={theme.colors.loss}
          />
          <Level
            label="Take profit"
            value={tp1 ? formatPrice(tp1.price, signal.pair) : '—'}
            tint={theme.colors.profit}
            suffix={signal.takeProfits.length > 1 ? `+${signal.takeProfits.length - 1}` : undefined}
          />
        </View>
      )}

      <View style={[styles.footer, { marginTop: theme.spacing.base, borderTopColor: theme.colors.divider }]}>
        <View style={styles.footerItem}>
          <Ionicons name="git-compare-outline" size={13} color={theme.colors.textTertiary} />
          <AppText variant="caption" color="textSecondary">
            R:R {formatRiskReward(signal.riskReward)}
          </AppText>
        </View>

        {closed && signal.pips !== undefined ? (
          <Badge
            label={`${formatPips(signal.pips)} pips`}
            tone={signal.pips >= 0 ? 'profit' : 'loss'}
          />
        ) : (
          <View style={styles.footerItem}>
            <AppText variant="caption" color="textTertiary">
              by {signal.authorName}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}

function Level({
  label,
  value,
  tint,
  suffix,
}: {
  label: string;
  value: string;
  tint?: string;
  suffix?: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.level,
        { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm },
      ]}
    >
      <AppText variant="overline" color="textTertiary">
        {label}
      </AppText>
      <View style={styles.levelValue}>
        <AppText variant="price" tint={tint}>
          {value}
        </AppText>
        {suffix && (
          <AppText variant="overline" color="textTertiary">
            {suffix}
          </AppText>
        )}
      </View>
    </View>
  );
}

function Dot() {
  const theme = useTheme();
  return <View style={[styles.dot, { backgroundColor: theme.colors.textTertiary }]} />;
}

/**
 * Locked premium signal, built from the server-side teaser projection.
 * The levels shown are placeholders — the real values were never sent.
 */
export function LockedSignalCard({ teaser }: { teaser: SignalTeaser }) {
  const theme = useTheme();
  const router = useRouter();
  const tint = directionColor(theme.colors, teaser.direction);

  return (
    <Card variant="surface" accentColor={theme.colors.premium} onPress={() => router.push('/premium')}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <AppText variant="h3">{formatPairLabel(teaser.pair)}</AppText>
          <DirectionBadge direction={teaser.direction} />
        </View>
        <PremiumBadge label="Locked" />
      </View>

      <View style={[styles.metaRow, { marginTop: 6 }]}>
        <AppText variant="caption" color="textTertiary">
          {teaser.timeframe}
        </AppText>
        <Dot />
        <AppText variant="caption" color="textTertiary">
          {timeAgo(teaser.publishedAt)}
        </AppText>
      </View>

      <View style={[styles.levels, { marginTop: theme.spacing.base }]}>
        {['Entry', 'Stop loss', 'Take profit'].map((label) => (
          <View
            key={label}
            style={[
              styles.level,
              { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.sm },
            ]}
          >
            <AppText variant="overline" color="textTertiary">
              {label}
            </AppText>
            <View style={styles.levelValue}>
              <Ionicons name="lock-closed" size={13} color={theme.colors.textTertiary} />
              <AppText variant="price" color="textDisabled">
                ••••
              </AppText>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.footer, { marginTop: theme.spacing.base, borderTopColor: theme.colors.divider }]}>
        <AppText variant="caption" color="textSecondary">
          {teaser.confidence} confidence
        </AppText>
        <View style={styles.footerItem}>
          <AppText variant="captionStrong" tint={theme.colors.premium}>
            Unlock
          </AppText>
          <Ionicons name="chevron-forward" size={13} color={theme.colors.premium} />
        </View>
      </View>
      {/* The accent bar reuses the direction colour for consistency. */}
      <View style={{ height: 0, backgroundColor: tint }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 2.5, height: 2.5, borderRadius: 2 },
  levels: { flexDirection: 'row', gap: 8 },
  level: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, gap: 3 },
  levelValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
