import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { useSettingsStore } from '../../store/settingsStore';
import { track } from '../../services/analytics';
import { formatPips, formatPrice, pipsBetween } from '../../utils/format';
import { dateTimeLabel } from '../../utils/date';
import type { Signal, SignalTimelineEntry } from '../../types/models';

/**
 * Detail-screen building blocks: copyable levels, the risk/reward visual and
 * the trade status timeline.
 */

// -------------------------------------------------------------- copy a level

export function CopyableLevel({
  label,
  value,
  tint,
  signalId,
  field,
  sublabel,
}: {
  label: string;
  value: string;
  tint?: string;
  signalId: string;
  field: string;
  sublabel?: string;
}) {
  const theme = useTheme();
  const haptics = useSettingsStore((s) => s.hapticsEnabled);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (value === '—') return;
    await Clipboard.setStringAsync(value);
    if (haptics) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void track({ name: 'signal_level_copied', params: { signal_id: signalId, field } });
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Pressable
      onPress={copy}
      accessibilityRole="button"
      accessibilityLabel={`Copy ${label}, ${value}`}
      style={({ pressed }) => [
        styles.copyRow,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: copied ? theme.colors.primary : theme.colors.border,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.flex}>
        <AppText variant="overline" color="textTertiary">
          {label}
        </AppText>
        <AppText variant="priceLg" tint={tint} style={{ marginTop: 2 }}>
          {value}
        </AppText>
        {sublabel && (
          <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
            {sublabel}
          </AppText>
        )}
      </View>

      {copied ? (
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(140)} style={styles.copied}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
          <AppText variant="overline" color="primary">
            Copied
          </AppText>
        </Animated.View>
      ) : (
        <Ionicons name="copy-outline" size={17} color={theme.colors.textTertiary} />
      )}
    </Pressable>
  );
}

// -------------------------------------------------------------- risk /reward

/**
 * Proportional view of risk versus reward, measured in pips from entry.
 * The bar widths are the actual ratio, so a 1:3 setup looks like one.
 */
export function RiskRewardBar({ signal }: { signal: Signal }) {
  const theme = useTheme();

  const riskPips = pipsBetween(signal.entry, signal.stopLoss, signal.pair);
  const furthestTp = signal.takeProfits.reduce(
    (max, tp) => Math.max(max, pipsBetween(signal.entry, tp.price, signal.pair)),
    0,
  );

  if (!Number.isFinite(riskPips) || riskPips <= 0 || furthestTp <= 0) return null;

  const total = riskPips + furthestTp;
  const riskShare = (riskPips / total) * 100;
  const rewardShare = 100 - riskShare;

  return (
    <View>
      <View style={styles.rrLabels}>
        <View>
          <AppText variant="overline" color="textTertiary">
            Risk
          </AppText>
          <AppText variant="bodyStrong" tint={theme.colors.loss}>
            {formatPips(riskPips).replace('+', '')} pips
          </AppText>
        </View>
        <View style={styles.alignEnd}>
          <AppText variant="overline" color="textTertiary">
            Reward
          </AppText>
          <AppText variant="bodyStrong" tint={theme.colors.profit}>
            {formatPips(furthestTp).replace('+', '')} pips
          </AppText>
        </View>
      </View>

      <View style={[styles.rrTrack, { marginTop: theme.spacing.sm }]}>
        <View
          style={{
            flex: riskShare,
            backgroundColor: theme.colors.loss,
            borderTopLeftRadius: 6,
            borderBottomLeftRadius: 6,
          }}
        />
        <View style={{ width: 2 }} />
        <View
          style={{
            flex: rewardShare,
            backgroundColor: theme.colors.profit,
            borderTopRightRadius: 6,
            borderBottomRightRadius: 6,
          }}
        />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ timeline

const TIMELINE_LABEL: Record<string, string> = {
  published: 'Signal published',
  pending: 'Waiting for entry',
  active: 'Entry hit',
  entry_hit: 'Entry hit',
  tp1_hit: 'Take profit 1 hit',
  tp2_hit: 'Take profit 2 hit',
  tp3_hit: 'Take profit 3 hit',
  tp_hit: 'Take profit hit',
  sl_hit: 'Stop loss hit',
  closed: 'Trade closed',
  cancelled: 'Signal cancelled',
};

/** Vertical status history of the trade. */
export function TradeTimeline({ entries }: { entries: SignalTimelineEntry[] }) {
  const theme = useTheme();
  if (entries.length === 0) return null;

  const ordered = [...entries].sort((a, b) => a.at - b.at);

  return (
    <View>
      {ordered.map((entry, index) => {
        const last = index === ordered.length - 1;
        const negative = entry.state === 'sl_hit' || entry.state === 'cancelled';
        const positive =
          entry.state === 'tp_hit' ||
          entry.state === 'tp1_hit' ||
          entry.state === 'tp2_hit' ||
          entry.state === 'tp3_hit';
        const tint = negative
          ? theme.colors.loss
          : positive
            ? theme.colors.profit
            : last
              ? theme.colors.primary
              : theme.colors.textTertiary;

        return (
          <View key={`${entry.state}-${entry.at}`} style={styles.timelineRow}>
            <View style={styles.timelineGutter}>
              <View style={[styles.timelineDot, { backgroundColor: tint }]} />
              {!last && <View style={[styles.timelineLine, { backgroundColor: theme.colors.divider }]} />}
            </View>
            <View style={styles.timelineBody}>
              <AppText variant="bodyStrong" tint={last ? theme.colors.textPrimary : undefined}>
                {TIMELINE_LABEL[entry.state] ?? entry.state}
              </AppText>
              <AppText variant="caption" color="textTertiary" style={{ marginTop: 1 }}>
                {dateTimeLabel(entry.at)}
              </AppText>
              {entry.note && (
                <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 4 }}>
                  {entry.note}
                </AppText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ----------------------------------------------------------- take profit row

export function TakeProfitList({ signal }: { signal: Signal }) {
  const theme = useTheme();
  if (signal.takeProfits.length === 0) return null;

  return (
    <View style={{ gap: 8 }}>
      {signal.takeProfits.map((tp) => (
        <View
          key={tp.level}
          style={[
            styles.tpRow,
            {
              backgroundColor: tp.hit ? theme.colors.profitMuted : theme.colors.surfaceAlt,
              borderRadius: theme.radius.sm,
              padding: theme.spacing.md,
            },
          ]}
        >
          <View style={styles.tpLabel}>
            <Ionicons
              name={tp.hit ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={tp.hit ? theme.colors.profit : theme.colors.textTertiary}
            />
            <AppText variant="bodySm" color={tp.hit ? 'profit' : 'textSecondary'}>
              Take profit {tp.level}
            </AppText>
          </View>
          <AppText variant="price" tint={tp.hit ? theme.colors.profit : undefined}>
            {formatPrice(tp.price, signal.pair)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1 },
  copied: { alignItems: 'center', gap: 2 },
  rrLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rrTrack: { flexDirection: 'row', height: 10 },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineGutter: { alignItems: 'center', width: 12 },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  timelineLine: { width: 1.5, flex: 1, marginVertical: 3 },
  timelineBody: { flex: 1, paddingBottom: 18 },
  tpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tpLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
