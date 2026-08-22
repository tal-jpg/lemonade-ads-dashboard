import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { ProgressBar } from '../ui/Common';
import { PerformanceDisclaimer } from '../ui/Disclaimer';
import { daysUntil, longDate } from '../../utils/date';
import { formatRiskReward } from '../../utils/format';
import type { AppUser, CommunityInfo, DailyStats, Message, Subscription } from '../../types/models';

/**
 * Membership status.
 *
 * Free accounts get an upgrade path; premium accounts get their renewal date
 * and a warning when the subscription is close to lapsing.
 */
export function MembershipCard({
  user,
  subscription,
  isPremium,
}: {
  user: AppUser;
  subscription: Subscription | null;
  isPremium: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();

  const expiresAt = subscription?.expiresAt ?? user.planExpiresAt;
  const remaining = daysUntil(expiresAt);
  const expiringSoon = isPremium && expiresAt !== undefined && remaining <= 7;

  if (!isPremium) {
    return (
      <Card variant="gradient" gradientColors={theme.colors.gradientSurface}>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Badge label="Free plan" tone="neutral" />
            <AppText variant="h3" style={{ marginTop: 8 }}>
              Unlock Premium Trading
            </AppText>
            <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 4 }}>
              Full signals, detailed analysis, the complete course and daily reviews.
            </AppText>
          </View>
        </View>
        <Button
          label="See plans"
          variant="premium"
          size="sm"
          icon="star"
          style={{ marginTop: theme.spacing.base }}
          onPress={() => router.push('/premium')}
        />
      </Card>
    );
  }

  return (
    <Card variant="gradient" gradientColors={theme.colors.premiumGradient} padded={false}>
      <View style={{ padding: theme.spacing.base }}>
        <View style={styles.rowBetween}>
          <View style={styles.premiumRow}>
            <Ionicons name="star" size={15} color="#1A1200" />
            <AppText variant="overline" tint="#1A1200">
              Premium member
            </AppText>
          </View>
          <Ionicons name="shield-checkmark" size={18} color="#1A1200" />
        </View>

        <AppText variant="h2" tint="#1A1200" style={{ marginTop: 10 }}>
          {user.fullName}
        </AppText>

        {expiresAt ? (
          <AppText variant="bodySm" tint="rgba(26,18,0,0.78)" style={{ marginTop: 2 }}>
            {expiringSoon
              ? `Renews in ${remaining} day${remaining === 1 ? '' : 's'}`
              : `Active until ${longDate(expiresAt)}`}
          </AppText>
        ) : (
          <AppText variant="bodySm" tint="rgba(26,18,0,0.78)" style={{ marginTop: 2 }}>
            Active
          </AppText>
        )}

        {expiringSoon && (
          <Button
            label="Manage subscription"
            variant="secondary"
            size="sm"
            style={{ marginTop: theme.spacing.md }}
            onPress={() => router.push('/premium')}
          />
        )}
      </View>
    </Card>
  );
}

/**
 * Today's trading results.
 *
 * Always paired with the performance disclaimer — a win rate shown without one
 * reads as a promise.
 */
export function TradingDaySummary({ stats }: { stats: DailyStats | null }) {
  const theme = useTheme();

  const items = [
    { label: 'Signals', value: String(stats?.signals ?? 0), tint: undefined },
    { label: 'Wins', value: String(stats?.wins ?? 0), tint: theme.colors.profit },
    { label: 'Losses', value: String(stats?.losses ?? 0), tint: theme.colors.loss },
    {
      label: 'Win rate',
      value: stats && stats.signals > 0 ? `${Math.round(stats.winRate)}%` : '—',
      tint: undefined,
    },
    { label: 'Avg R:R', value: stats ? formatRiskReward(stats.avgRR) : '—', tint: undefined },
  ];

  return (
    <Card variant="surface">
      <View style={styles.rowBetween}>
        <AppText variant="title">Trading day</AppText>
        <Badge label="Today" tone="neutral" />
      </View>

      <View style={[styles.statsRow, { marginTop: theme.spacing.base }]}>
        {items.map((item) => (
          <View key={item.label} style={styles.stat}>
            <AppText variant="h3" tint={item.tint}>
              {item.value}
            </AppText>
            <AppText variant="overline" color="textTertiary" style={{ marginTop: 2 }}>
              {item.label}
            </AppText>
          </View>
        ))}
      </View>

      <PerformanceDisclaimer style={{ marginTop: theme.spacing.md }} />
    </Card>
  );
}

/** Upgrade prompt for free accounts, listing what premium actually adds. */
export function PremiumCTA() {
  const theme = useTheme();
  const router = useRouter();

  const benefits = [
    'Up to 6 high-quality signals a day',
    'Entry, stop loss and all take-profit levels',
    'Detailed technical and fundamental analysis',
    'Complete course: beginner to SMC / ICT',
    'Daily trade reviews and weekly analysis',
  ];

  return (
    <Card variant="surface" padded={false}>
      <LinearGradient
        colors={['rgba(245,196,81,0.14)', 'rgba(245,196,81,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ padding: theme.spacing.base }}
      >
        <View style={styles.premiumRow}>
          <Ionicons name="star" size={16} color={theme.colors.premium} />
          <AppText variant="overline" tint={theme.colors.premium}>
            Premium
          </AppText>
        </View>

        <AppText variant="h2" style={{ marginTop: 8 }}>
          Trade with the full picture
        </AppText>

        <View style={{ marginTop: theme.spacing.md, gap: 8 }}>
          {benefits.map((benefit) => (
            <View key={benefit} style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={15} color={theme.colors.premium} />
              <AppText variant="bodySm" color="textSecondary" style={styles.flex}>
                {benefit}
              </AppText>
            </View>
          ))}
        </View>

        <Button
          label="Unlock Premium"
          variant="premium"
          icon="lock-open"
          style={{ marginTop: theme.spacing.base }}
          onPress={() => router.push('/premium')}
        />
      </LinearGradient>
    </Card>
  );
}

/** Community snapshot with the most recent message. */
export function CommunityPreview({
  info,
  latest,
  online,
}: {
  info: CommunityInfo | null;
  latest: Message | null;
  online: number;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Card variant="surface" onPress={() => router.push('/(tabs)/community')}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <AppText variant="title">{info?.name ?? 'Trading Floor'}</AppText>
          <View style={[styles.memberRow, { marginTop: 3 }]}>
            <View style={[styles.presenceDot, { backgroundColor: theme.colors.profit }]} />
            <AppText variant="caption" color="textTertiary">
              {info?.memberCount ?? 0} members · {online} online
            </AppText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={17} color={theme.colors.textTertiary} />
      </View>

      {latest ? (
        <View
          style={[
            styles.latest,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.sm,
              padding: theme.spacing.md,
              marginTop: theme.spacing.md,
            },
          ]}
        >
          <Avatar name={latest.authorName} uri={latest.authorPhoto} size={28} />
          <View style={styles.flex}>
            <AppText variant="captionStrong" color="textSecondary">
              {latest.authorName}
            </AppText>
            <AppText variant="bodySm" numberOfLines={1} style={{ marginTop: 1 }}>
              {latest.deleted
                ? 'Message removed'
                : latest.type === 'text'
                  ? (latest.text ?? '')
                  : `Sent ${latest.type === 'image' ? 'a photo' : latest.type === 'audio' ? 'a voice note' : 'an attachment'}`}
            </AppText>
          </View>
        </View>
      ) : (
        <AppText variant="bodySm" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
          No messages yet — be the first to post.
        </AppText>
      )}
    </Card>
  );
}

/** Continue-learning card driven by real progress. */
export function LearnPreview({
  title,
  subtitle,
  progress,
  onPress,
}: {
  title: string;
  subtitle: string;
  progress: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Card variant="surface" onPress={onPress}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <AppText variant="overline" color="primary">
            Continue learning
          </AppText>
          <AppText variant="title" style={{ marginTop: 4 }} numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        </View>
        <View
          style={[
            styles.playButton,
            { backgroundColor: theme.colors.primaryMuted, borderRadius: theme.radius.md },
          ]}
        >
          <Ionicons name="play" size={17} color={theme.colors.primary} />
        </View>
      </View>
      <ProgressBar value={progress} style={{ marginTop: theme.spacing.md }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  presenceDot: { width: 6, height: 6, borderRadius: 3 },
  latest: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});
