import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Segmented } from '../../components/ui/Segmented';
import { SignalCardSkeleton } from '../../components/ui/Skeleton';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { RiskDisclaimer } from '../../components/ui/Disclaimer';
import { ProgressBar } from '../../components/ui/Common';
import { SignalCard, LockedSignalCard } from '../../components/signals/SignalCard';
import { useSignals, usePremiumTeasers, type SignalFilter } from '../../hooks/useSignals';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useIsPremium } from '../../store/authStore';
import { startOfTodayMs } from '../../utils/date';
import type { Signal, SignalTeaser } from '../../types/models';

type Row =
  | { kind: 'signal'; signal: Signal }
  | { kind: 'teaser'; teaser: SignalTeaser }
  | { kind: 'upgrade' };

/**
 * Signals feed.
 *
 * The daily allowance meter at the top is driven by remote settings, so raising
 * the free limit from 3 to 4 is an admin change, not a release.
 */
export default function Signals() {
  const theme = useTheme();
  const router = useRouter();
  const isPremium = useIsPremium();
  const settings = useAppSettings();

  const [filter, setFilter] = useState<SignalFilter>('all');
  const { signals, counts, loading, loadingMore, error, hasMore, loadMore, cappedByPlan } =
    useSignals(filter);
  const teasers = usePremiumTeasers();

  const todayStart = startOfTodayMs();
  const receivedToday = signals.filter((s) => s.publishedAt >= todayStart).length;
  const dailyLimit = isPremium
    ? settings.signalLimits.premiumPerDay
    : settings.signalLimits.freePerDay;

  const rows: Row[] = [
    ...signals.map((signal) => ({ kind: 'signal' as const, signal })),
    ...(filter === 'all' ? teasers.map((teaser) => ({ kind: 'teaser' as const, teaser })) : []),
    ...(cappedByPlan ? [{ kind: 'upgrade' as const }] : []),
  ];

  const header = (
    <View style={{ paddingTop: theme.spacing.base }}>
      <AppText variant="h1">Signals</AppText>

      <Card variant="flat" style={{ marginTop: theme.spacing.base }}>
        <View style={styles.meterHeader}>
          <View style={styles.row}>
            <Ionicons
              name={isPremium ? 'star' : 'flash-outline'}
              size={15}
              color={isPremium ? theme.colors.premium : theme.colors.primary}
            />
            <AppText variant="captionStrong" color="textSecondary">
              {isPremium ? 'Premium allowance' : 'Free plan allowance'}
            </AppText>
          </View>
          <AppText variant="captionStrong">
            {Math.min(receivedToday, dailyLimit)} / {dailyLimit} today
          </AppText>
        </View>
        <ProgressBar
          value={(Math.min(receivedToday, dailyLimit) / Math.max(1, dailyLimit)) * 100}
          color={isPremium ? theme.colors.premium : theme.colors.primary}
          style={{ marginTop: 10 }}
        />
        {!isPremium && (
          <AppText variant="caption" color="textTertiary" style={{ marginTop: 8 }}>
            Premium members receive up to {settings.signalLimits.premiumPerDay} signals a day with
            full analysis.
          </AppText>
        )}
      </Card>

      <Segmented
        style={{ marginTop: theme.spacing.base }}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All', count: counts.all },
          { value: 'active', label: 'Active', count: counts.active },
          { value: 'closed', label: 'Closed', count: counts.closed },
        ]}
      />
    </View>
  );

  if (loading) {
    return (
      <Screen tabBarPadding>
        {header}
        <View style={{ gap: 12, marginTop: theme.spacing.base }}>
          {[0, 1, 2].map((i) => (
            <SignalCardSkeleton key={i} />
          ))}
        </View>
      </Screen>
    );
  }

  if (error && signals.length === 0) {
    return (
      <Screen tabBarPadding>
        {header}
        <ErrorView message={error} onRetry={() => setFilter(filter)} />
      </Screen>
    );
  }

  return (
    <Screen tabBarPadding padded={false}>
      <FlashList
        data={rows}
        keyExtractor={(row, index) =>
          row.kind === 'signal' ? row.signal.id : row.kind === 'teaser' ? `t-${row.teaser.id}` : `x-${index}`
        }
        contentContainerStyle={{
          paddingHorizontal: theme.layout.screenPadding,
          paddingBottom: theme.layout.tabBarHeight + 32,
        }}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          if (item.kind === 'signal') return <SignalCard signal={item.signal} />;
          if (item.kind === 'teaser') return <LockedSignalCard teaser={item.teaser} />;
          return (
            <Card variant="outlined">
              <AppText variant="title" center>
                That's the free history
              </AppText>
              <AppText variant="bodySm" color="textSecondary" center style={{ marginTop: 6 }}>
                Premium members can scroll the full signal archive and see every closed trade.
              </AppText>
              <Button
                label="Unlock full history"
                variant="premium"
                size="sm"
                icon="star"
                style={{ marginTop: theme.spacing.base }}
                onPress={() => router.push('/premium')}
              />
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyView
            icon="pulse-outline"
            title="No signals available today"
            message={
              filter === 'active'
                ? 'No trades are open right now. New setups arrive during the London and New York sessions.'
                : 'Nothing has been published yet. You will be notified the moment a signal goes live.'
            }
          />
        }
        ListFooterComponent={
          <View style={{ marginTop: theme.spacing.lg }}>
            {loadingMore && <LoadingView />}
            <RiskDisclaimer />
          </View>
        }
        onEndReached={hasMore ? loadMore : undefined}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
