import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Divider } from '../ui/Common';
import { formatPairLabel } from '../../utils/format';
import type { DailyBrief } from '../../types/models';

const MOOD: Record<DailyBrief['mood'], { label: string; tone: 'profit' | 'loss' | 'warning' }> = {
  risk_on: { label: 'Risk on', tone: 'profit' },
  risk_off: { label: 'Risk off', tone: 'loss' },
  mixed: { label: 'Mixed', tone: 'warning' },
};

const IMPACT_TONE = { low: 'neutral', medium: 'warning', high: 'loss' } as const;

/**
 * The daily trading brief: market mood, pair biases, the day's events and key
 * levels. Collapsed by default so it never dominates the dashboard.
 */
export function DailyBriefCard({ brief }: { brief: DailyBrief }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const mood = MOOD[brief.mood];

  return (
    <Card variant="surface">
      <View style={styles.rowBetween}>
        <View style={styles.headerLeft}>
          <Ionicons name="sunny-outline" size={16} color={theme.colors.primary} />
          <AppText variant="overline" color="primary">
            Daily brief
          </AppText>
        </View>
        <Badge label={mood.label} tone={mood.tone} />
      </View>

      <AppText variant="title" style={{ marginTop: theme.spacing.sm }}>
        {brief.headline}
      </AppText>
      <AppText
        variant="bodySm"
        color="textSecondary"
        numberOfLines={expanded ? undefined : 2}
        style={{ marginTop: 4 }}
      >
        {brief.summary}
      </AppText>

      {expanded && (
        <View style={{ marginTop: theme.spacing.base, gap: theme.spacing.base }}>
          {brief.majorPairs.length > 0 && (
            <View>
              <AppText variant="overline" color="textTertiary">
                Major pairs
              </AppText>
              <View style={[styles.pairGrid, { marginTop: 8 }]}>
                {brief.majorPairs.map((p) => (
                  <View
                    key={p.pair}
                    style={[
                      styles.pairChip,
                      {
                        backgroundColor: theme.colors.surfaceAlt,
                        borderRadius: theme.radius.sm,
                      },
                    ]}
                  >
                    <AppText variant="captionStrong">{formatPairLabel(p.pair)}</AppText>
                    <AppText
                      variant="overline"
                      tint={
                        p.bias === 'bullish'
                          ? theme.colors.profit
                          : p.bias === 'bearish'
                            ? theme.colors.loss
                            : theme.colors.textTertiary
                      }
                    >
                      {p.bias}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {brief.events.length > 0 && (
            <View>
              <Divider spacing={0} />
              <AppText variant="overline" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
                Today's events
              </AppText>
              <View style={{ marginTop: 8, gap: 8 }}>
                {brief.events.map((event, i) => (
                  <View key={`${event.title}-${i}`} style={styles.eventRow}>
                    <AppText variant="mono" color="textTertiary" style={styles.eventTime}>
                      {event.time}
                    </AppText>
                    <AppText variant="bodySm" style={styles.flex} numberOfLines={1}>
                      {event.title}
                    </AppText>
                    <Badge label={event.impact} tone={IMPACT_TONE[event.impact]} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {brief.keyLevels.length > 0 && (
            <View>
              <Divider spacing={0} />
              <AppText variant="overline" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
                Key levels
              </AppText>
              <View style={{ marginTop: 8, gap: 6 }}>
                {brief.keyLevels.map((level) => (
                  <View key={level.pair} style={styles.rowBetween}>
                    <AppText variant="bodySm" color="textSecondary">
                      {formatPairLabel(level.pair)}
                    </AppText>
                    <View style={styles.levelValues}>
                      <AppText variant="priceSm" tint={theme.colors.profit}>
                        S {level.support}
                      </AppText>
                      <AppText variant="priceSm" tint={theme.colors.loss}>
                        R {level.resistance}
                      </AppText>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {brief.focus ? (
            <View
              style={[
                styles.focus,
                { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.sm },
              ]}
            >
              <Ionicons name="flag-outline" size={15} color={theme.colors.primary} />
              <AppText variant="bodySm" style={styles.flex}>
                {brief.focus}
              </AppText>
            </View>
          ) : null}
        </View>
      )}

      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={[styles.toggle, { marginTop: theme.spacing.md }]}
        accessibilityRole="button"
      >
        <AppText variant="captionStrong" color="primary">
          {expanded ? 'Show less' : 'Read the full brief'}
        </AppText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={13}
          color={theme.colors.primary}
        />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pairGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pairChip: { paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', gap: 2 },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eventTime: { width: 42 },
  levelValues: { flexDirection: 'row', gap: 12 },
  focus: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
});
