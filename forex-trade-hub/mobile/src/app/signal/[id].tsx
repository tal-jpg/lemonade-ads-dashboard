import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { StackHeader } from '../../components/ui/StackHeader';
import {
  Badge,
  ConfidenceBadge,
  DirectionBadge,
  PremiumBadge,
  TradeStateBadge,
} from '../../components/ui/Badge';
import { SectionHeader, Divider } from '../../components/ui/Common';
import { SignalCardSkeleton } from '../../components/ui/Skeleton';
import { ErrorView } from '../../components/ui/StateViews';
import { RiskDisclaimer } from '../../components/ui/Disclaimer';
import { PremiumLock } from '../../components/ui/PremiumLock';
import {
  CopyableLevel,
  RiskRewardBar,
  TakeProfitList,
  TradeTimeline,
} from '../../components/signals/SignalParts';
import { useSignal } from '../../hooks/useSignals';
import { directionColor } from '../../theme/colors';
import {
  formatPairLabel,
  formatPips,
  formatPrice,
  formatRiskReward,
  pipsBetween,
} from '../../utils/format';
import { dateTimeLabel } from '../../utils/date';
import { track } from '../../services/analytics';

/**
 * Signal detail.
 *
 * The levels are the reason a trader opens this screen, so they are first,
 * large, monospaced and one tap to copy.
 */
export default function SignalDetail() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { signal, loading, error, isLocked } = useSignal(id);

  useEffect(() => {
    if (signal) {
      void track({
        name: 'signal_viewed',
        params: { signal_id: signal.id, is_premium: signal.isPremium, pair: signal.pair },
      });
    }
  }, [signal]);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Signal" />
        <View style={{ padding: theme.layout.screenPadding }}>
          <SignalCardSkeleton />
        </View>
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Premium signal" />
        <View style={{ padding: theme.layout.screenPadding }}>
          <PremiumLock
            contentType="signal"
            title="This is a Premium signal"
            message="Upgrade to see the entry, stop loss, all take-profit levels and the full analysis."
          />
        </View>
      </View>
    );
  }

  if (error || !signal) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Signal" />
        <ErrorView
          title="Signal unavailable"
          message={error ?? 'This signal is no longer available.'}
        />
      </View>
    );
  }

  const tint = directionColor(theme.colors, signal.direction);
  const riskPips = pipsBetween(signal.entry, signal.stopLoss, signal.pair);
  const closed = signal.tradeState !== 'pending' && signal.tradeState !== 'active';

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader
        title={formatPairLabel(signal.pair)}
        subtitle={`${signal.timeframe} · ${dateTimeLabel(signal.publishedAt)}`}
        right={signal.isPremium ? <PremiumBadge /> : undefined}
      />

      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card variant="surface" accentColor={tint}>
            <View style={styles.heroTop}>
              <View style={styles.row}>
                <AppText variant="h1">{formatPairLabel(signal.pair)}</AppText>
                <DirectionBadge direction={signal.direction} />
              </View>
              <TradeStateBadge state={signal.tradeState} />
            </View>

            <View style={[styles.row, { marginTop: theme.spacing.sm, flexWrap: 'wrap' }]}>
              <ConfidenceBadge confidence={signal.confidence} />
              <Badge label={signal.timeframe} tone="neutral" icon="time-outline" />
              {signal.strategy && <Badge label={signal.strategy} tone="info" />}
            </View>

            {closed && signal.result && (
              <View
                style={[
                  styles.result,
                  {
                    backgroundColor:
                      signal.result === 'win' ? theme.colors.profitMuted : theme.colors.lossMuted,
                    borderRadius: theme.radius.sm,
                    marginTop: theme.spacing.base,
                  },
                ]}
              >
                <Ionicons
                  name={signal.result === 'win' ? 'trophy-outline' : 'close-circle-outline'}
                  size={17}
                  color={signal.result === 'win' ? theme.colors.profit : theme.colors.loss}
                />
                <AppText
                  variant="bodyStrong"
                  tint={signal.result === 'win' ? theme.colors.profit : theme.colors.loss}
                >
                  {signal.result === 'win' ? 'Target reached' : signal.result === 'loss' ? 'Stopped out' : 'Break even'}
                </AppText>
                {signal.pips !== undefined && (
                  <AppText variant="price" tint={signal.pips >= 0 ? theme.colors.profit : theme.colors.loss}>
                    {formatPips(signal.pips)} pips
                  </AppText>
                )}
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Levels */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Levels" subtitle="Tap any value to copy" />
          <View style={{ gap: 10 }}>
            <CopyableLevel
              label="Entry price"
              value={formatPrice(signal.entry, signal.pair)}
              signalId={signal.id}
              field="entry"
            />
            <CopyableLevel
              label="Stop loss"
              value={formatPrice(signal.stopLoss, signal.pair)}
              tint={theme.colors.loss}
              sublabel={`${Math.round(riskPips)} pips risk`}
              signalId={signal.id}
              field="stop_loss"
            />
            {signal.takeProfits.map((tp) => (
              <CopyableLevel
                key={tp.level}
                label={`Take profit ${tp.level}${tp.hit ? ' · hit' : ''}`}
                value={formatPrice(tp.price, signal.pair)}
                tint={theme.colors.profit}
                sublabel={`${Math.round(pipsBetween(signal.entry, tp.price, signal.pair))} pips`}
                signalId={signal.id}
                field={`tp${tp.level}`}
              />
            ))}
          </View>
        </View>

        {/* Risk / reward */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Risk / reward" subtitle={formatRiskReward(signal.riskReward)} />
          <Card variant="surface">
            <RiskRewardBar signal={signal} />
            <Divider spacing={16} />
            <TakeProfitList signal={signal} />
          </Card>
        </View>

        {/* Chart */}
        {signal.chartUrl && (
          <View style={{ marginTop: theme.spacing.xl }}>
            <SectionHeader title="Chart" />
            <Card variant="surface" padded={false}>
              <Image
                source={{ uri: signal.chartUrl }}
                style={styles.chart}
                contentFit="cover"
                transition={220}
                cachePolicy="memory-disk"
                accessibilityLabel={`${signal.pair} chart`}
              />
            </Card>
          </View>
        )}

        {/* Analysis */}
        {(signal.analysis?.technical || signal.analysis?.fundamental) && (
          <View style={{ marginTop: theme.spacing.xl }}>
            <SectionHeader title="Analysis" />
            <Card variant="surface">
              {signal.analysis.technical ? (
                <View>
                  <AppText variant="overline" color="primary">
                    Technical
                  </AppText>
                  <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
                    {signal.analysis.technical}
                  </AppText>
                </View>
              ) : null}

              {signal.analysis.technical && signal.analysis.fundamental ? <Divider spacing={16} /> : null}

              {signal.analysis.fundamental ? (
                <View>
                  <AppText variant="overline" color="info">
                    Fundamental
                  </AppText>
                  <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
                    {signal.analysis.fundamental}
                  </AppText>
                </View>
              ) : null}
            </Card>
          </View>
        )}

        {/* Timeline */}
        {signal.timeline.length > 0 && (
          <View style={{ marginTop: theme.spacing.xl }}>
            <SectionHeader title="Trade status" />
            <Card variant="surface">
              <TradeTimeline entries={signal.timeline} />
            </Card>
          </View>
        )}

        {/* Meta */}
        <Card variant="flat" style={{ marginTop: theme.spacing.xl }}>
          <AppText variant="caption" color="textTertiary">
            Published by {signal.authorName} · {dateTimeLabel(signal.publishedAt)}
            {signal.updatedAt ? ` · Updated ${dateTimeLabel(signal.updatedAt)}` : ''}
          </AppText>
        </Card>

        <RiskDisclaimer style={{ marginTop: theme.spacing.base }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  chart: { width: '100%', height: 220 },
});
