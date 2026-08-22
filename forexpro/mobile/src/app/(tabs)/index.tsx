import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { Avatar } from '../../components/ui/Avatar';
import { IconButton, SectionHeader } from '../../components/ui/Common';
import { SignalCardSkeleton, Skeleton } from '../../components/ui/Skeleton';
import { EmptyView } from '../../components/ui/StateViews';
import { RiskDisclaimer } from '../../components/ui/Disclaimer';
import { MarketStrip } from '../../components/home/MarketStrip';
import { DailyBriefCard } from '../../components/home/DailyBriefCard';
import {
  CommunityPreview,
  LearnPreview,
  MembershipCard,
  PremiumCTA,
  TradingDaySummary,
} from '../../components/home/HomeCards';
import { SignalCard, LockedSignalCard } from '../../components/signals/SignalCard';
import { NewsTile } from '../../components/news/NewsCard';
import { useAuthStore, useIsPremium } from '../../store/authStore';
import { useLatestSignal, usePremiumTeasers, useTodayStats, useDailyBrief } from '../../hooks/useSignals';
import { useCourses, useLatestNews, useMarketQuotes, useProgress } from '../../hooks/useContent';
import { useCommunityInfo, useMembers, useMessages } from '../../hooks/useCommunity';
import { useUnreadCount } from '../../hooks/useNotifications';
import { greeting } from '../../utils/date';
import { progressPct } from '../../utils/format';
import { DEMO_MODE, DEMO_BANNER_TEXT } from '../../config/demo';
import { Badge } from '../../components/ui/Badge';

/**
 * Home dashboard.
 *
 * Ordered by what a trader checks first: who am I and what's my plan, what is
 * the market doing, what is the newest signal, then the brief, results, news,
 * learning and the community.
 */
export default function Home() {
  const theme = useTheme();
  const router = useRouter();

  const profile = useAuthStore((s) => s.profile);
  const subscription = useAuthStore((s) => s.subscription);
  const isPremium = useIsPremium();
  const unread = useUnreadCount();

  const { quotes, isDemo, loading: quotesLoading } = useMarketQuotes();
  const { signal, loading: signalLoading } = useLatestSignal();
  const teasers = usePremiumTeasers();
  const { stats } = useTodayStats();
  const { brief } = useDailyBrief();
  const { items: news, loading: newsLoading } = useLatestNews(6);
  const { courses } = useCourses();
  const { completedIn } = useProgress();
  const { info } = useCommunityInfo();
  const { online } = useMembers();
  const { messages } = useMessages();

  const [refreshing, setRefreshing] = useState(false);

  // Every section is driven by a live listener, so a pull-to-refresh is a
  // deliberate no-op beyond the visual acknowledgement.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  if (!profile) {
    return (
      <Screen scroll tabBarPadding>
        <View style={{ gap: 16, paddingTop: 20 }}>
          <Skeleton width="60%" height={26} />
          <Skeleton height={110} radius={18} />
          <SignalCardSkeleton />
        </View>
      </Screen>
    );
  }

  const inProgressCourse = courses.find((c) => {
    const done = completedIn(c.id);
    return done > 0 && done < c.lessonCount;
  });
  const nextCourse = inProgressCourse ?? courses[0];

  return (
    <Screen scroll tabBarPadding refreshing={refreshing} onRefresh={onRefresh}>
      {/* Header */}
      <View style={[styles.header, { paddingVertical: theme.spacing.base }]}>
        <Avatar name={profile.fullName} uri={profile.photoURL} size={44} ring={isPremium} />
        <View style={styles.flex}>
          <AppText variant="caption" color="textTertiary">
            {greeting()}
          </AppText>
          <AppText variant="title" numberOfLines={1}>
            {profile.fullName.split(' ')[0]}
          </AppText>
        </View>
        <IconButton
          icon="notifications-outline"
          badge={unread}
          variant="surface"
          accessibilityLabel={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
          onPress={() => router.push('/notifications')}
        />
      </View>

      {DEMO_MODE && (
        <View style={{ marginBottom: theme.spacing.base }}>
          <Badge label={DEMO_BANNER_TEXT} tone="info" icon="flask-outline" />
        </View>
      )}

      <Animated.View entering={FadeInDown.duration(340)}>
        <MembershipCard user={profile} subscription={subscription} isPremium={isPremium} />
      </Animated.View>

      {/* Market snapshot */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Markets" subtitle="Major pairs and metals" />
        <MarketStrip quotes={quotes} loading={quotesLoading} isDemo={isDemo} />
      </View>

      {/* Latest signal */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader
          title="Latest signal"
          actionLabel="All signals"
          onAction={() => router.push('/(tabs)/signals')}
        />
        {signalLoading ? (
          <SignalCardSkeleton />
        ) : signal ? (
          <Animated.View entering={FadeInDown.duration(340)}>
            <SignalCard signal={signal} />
          </Animated.View>
        ) : (
          <EmptyView
            icon="pulse-outline"
            title="No signals yet today"
            message="New setups are published throughout the London and New York sessions."
            compact
          />
        )}
      </View>

      {/* Locked premium signals for free accounts */}
      {!isPremium && teasers.length > 0 && (
        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader
            title="Premium signals today"
            subtitle={`${teasers.length} published — locked on the free plan`}
          />
          <View style={{ gap: 12 }}>
            {teasers.slice(0, 2).map((teaser) => (
              <LockedSignalCard key={teaser.id} teaser={teaser} />
            ))}
          </View>
        </View>
      )}

      {/* Daily brief */}
      {brief && (
        <View style={{ marginTop: theme.spacing.xl }}>
          <DailyBriefCard brief={brief} />
        </View>
      )}

      {/* Trading day summary */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <TradingDaySummary stats={stats} />
      </View>

      {/* News */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Market news" actionLabel="See all" onAction={() => router.push('/news')} />
        {newsLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {[0, 1].map((i) => (
              <Skeleton key={i} width={210} height={176} radius={theme.radius.lg} />
            ))}
          </ScrollView>
        ) : news.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {news.map((article) => (
              <NewsTile key={article.id} article={article} />
            ))}
          </ScrollView>
        ) : (
          <EmptyView icon="newspaper-outline" title="No news available" compact />
        )}
      </View>

      {/* Continue learning */}
      {nextCourse && (
        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader title="Education" actionLabel="Browse" onAction={() => router.push('/(tabs)/learn')} />
          <LearnPreview
            title={nextCourse.title}
            subtitle={`${completedIn(nextCourse.id)} of ${nextCourse.lessonCount} lessons complete`}
            progress={progressPct(completedIn(nextCourse.id), nextCourse.lessonCount)}
            onPress={() => router.push(`/course/${nextCourse.id}`)}
          />
        </View>
      )}

      {/* Community */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Community" actionLabel="Open" onAction={() => router.push('/(tabs)/community')} />
        <CommunityPreview info={info} latest={messages[0] ?? null} online={online} />
      </View>

      {/* Upgrade */}
      {!isPremium && (
        <View style={{ marginTop: theme.spacing.xl }}>
          <PremiumCTA />
        </View>
      )}

      <RiskDisclaimer style={{ marginTop: theme.spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', gap: 10, paddingRight: 16 },
});
