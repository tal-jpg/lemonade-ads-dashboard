import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from '../components/ui/AppText';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StackHeader } from '../components/ui/StackHeader';
import { Divider } from '../components/ui/Common';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorView } from '../components/ui/StateViews';
import { useSubscription } from '../hooks/useSubscription';
import { useAppSettings } from '../hooks/useAppSettings';
import { useIsPremium } from '../store/authStore';
import { longDate } from '../utils/date';
import { track } from '../services/analytics';
import type { PlanOffer } from '../types/models';

const COMPARISON: { feature: string; free: string | boolean; premium: string | boolean }[] = [
  { feature: 'Daily signals', free: '2–3', premium: '5–6' },
  { feature: 'Entry, stop loss, targets', free: 'Free signals only', premium: true },
  { feature: 'Technical & fundamental analysis', free: false, premium: true },
  { feature: 'Professional charts', free: false, premium: true },
  { feature: 'Daily market brief', free: 'Summary', premium: 'Full brief' },
  { feature: 'Economic calendar & sentiment', free: false, premium: true },
  { feature: 'Complete trading course', free: 'Intro lessons', premium: 'Beginner → advanced' },
  { feature: 'SMC / ICT education', free: false, premium: true },
  { feature: 'Psychology & risk management', free: false, premium: true },
  { feature: 'Daily trade reviews', free: false, premium: true },
  { feature: 'Weekly analysis', free: false, premium: true },
  { feature: 'Community access', free: true, premium: true },
];

/**
 * Paywall.
 *
 * Yearly is highlighted as the best value, the comparison table is honest about
 * what free already includes, and restore-purchases is always visible — all
 * three are App Store review expectations as much as good practice.
 */
export default function Premium() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useAppSettings();
  const isPremium = useIsPremium();
  const { source } = useLocalSearchParams<{ source?: string }>();

  const {
    offers,
    subscription,
    loading,
    purchasing,
    restoring,
    error,
    storeUnavailable,
    purchase,
    restorePurchases,
    retry,
  } = useSubscription();

  const [selected, setSelected] = useState<PlanOffer | null>(null);

  useEffect(() => {
    void track({ name: 'paywall_viewed', params: { source: source ?? 'direct' } });
  }, [source]);

  useEffect(() => {
    if (!selected && offers.length > 0) {
      setSelected(offers.find((o) => o.highlighted) ?? offers[0]);
    }
  }, [offers, selected]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title={isPremium ? 'Your subscription' : 'Go Premium'} />

      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(320)}>
          <Card variant="surface" padded={false}>
            <LinearGradient
              colors={['rgba(245,196,81,0.18)', 'rgba(245,196,81,0.02)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: theme.spacing.lg }}
            >
              <View
                style={[
                  styles.crown,
                  { backgroundColor: theme.colors.premiumMuted, borderRadius: theme.radius.md },
                ]}
              >
                <Ionicons name="star" size={22} color={theme.colors.premium} />
              </View>
              <AppText variant="h1" style={{ marginTop: theme.spacing.base }}>
                {isPremium ? "You're Premium" : 'Trade with the full picture'}
              </AppText>
              <AppText variant="body" color="textSecondary" style={{ marginTop: 6 }}>
                {isPremium
                  ? 'You have full access to every signal, the complete course and daily reviews.'
                  : 'Every level, the analysis behind it, the full course and daily trade reviews.'}
              </AppText>
            </LinearGradient>
          </Card>
        </Animated.View>

        {/* Current subscription */}
        {isPremium && subscription && (
          <Card variant="surface" style={{ marginTop: theme.spacing.base }}>
            <View style={styles.rowBetween}>
              <AppText variant="captionStrong" color="textSecondary">
                Status
              </AppText>
              <Badge
                label={subscription.status.replace('_', ' ')}
                tone={subscription.status === 'active' ? 'profit' : 'warning'}
              />
            </View>
            {subscription.expiresAt && (
              <>
                <Divider spacing={12} />
                <View style={styles.rowBetween}>
                  <AppText variant="captionStrong" color="textSecondary">
                    {subscription.autoRenewing ? 'Renews on' : 'Access until'}
                  </AppText>
                  <AppText variant="bodyStrong">{longDate(subscription.expiresAt)}</AppText>
                </View>
              </>
            )}
            <AppText variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
              Manage or cancel your subscription in your device's store settings. Cancelling keeps
              access until the end of the paid period.
            </AppText>
          </Card>
        )}

        {/* Plans */}
        {!isPremium && (
          <View style={{ marginTop: theme.spacing.xl }}>
            <AppText variant="h3">Choose your plan</AppText>

            {loading ? (
              <View style={{ gap: 10, marginTop: theme.spacing.base }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={84} radius={theme.radius.lg} />
                ))}
              </View>
            ) : error || offers.length === 0 ? (
              <ErrorView
                title={storeUnavailable ? 'Store unavailable' : 'No plans available'}
                message={error ?? 'Please try again in a moment.'}
                onRetry={retry}
                compact
              />
            ) : (
              <View style={{ gap: 10, marginTop: theme.spacing.base }}>
                {offers.map((offer) => {
                  const active = selected?.productId === offer.productId;
                  return (
                    <Pressable
                      key={offer.productId}
                      onPress={() => {
                        setSelected(offer);
                        void track({ name: 'plan_selected', params: { plan: offer.id } });
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      style={[
                        styles.plan,
                        {
                          backgroundColor: active ? theme.colors.premiumMuted : theme.colors.surface,
                          borderColor: active ? theme.colors.premium : theme.colors.border,
                          borderRadius: theme.radius.lg,
                          padding: theme.spacing.base,
                        },
                      ]}
                    >
                      <View style={styles.planLeft}>
                        <Ionicons
                          name={active ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={active ? theme.colors.premium : theme.colors.textTertiary}
                        />
                        <View>
                          <View style={styles.row}>
                            <AppText variant="title">
                              {offer.id === 'monthly'
                                ? 'Monthly'
                                : offer.id === 'quarterly'
                                  ? 'Quarterly'
                                  : 'Yearly'}
                            </AppText>
                            {offer.highlighted && <Badge label="Best value" tone="premium" />}
                          </View>
                          {offer.perMonthLabel && (
                            <AppText variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                              {offer.perMonthLabel}
                            </AppText>
                          )}
                        </View>
                      </View>

                      <View style={styles.planRight}>
                        <AppText variant="price">{offer.price}</AppText>
                        <AppText variant="caption" color="textTertiary">
                          {offer.periodLabel}
                        </AppText>
                        {offer.savingsPct ? (
                          <AppText variant="overline" tint={theme.colors.profit}>
                            Save {offer.savingsPct}%
                          </AppText>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {selected && (
              <Button
                label={`Subscribe — ${selected.price} ${selected.periodLabel}`}
                variant="premium"
                loading={purchasing === selected.productId}
                style={{ marginTop: theme.spacing.base }}
                onPress={() => void purchase(selected)}
              />
            )}

            <Button
              label="Restore purchases"
              variant="ghost"
              size="sm"
              loading={restoring}
              style={{ marginTop: theme.spacing.sm }}
              onPress={() => void restorePurchases()}
            />
          </View>
        )}

        {/* Comparison */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <AppText variant="h3">What you get</AppText>
          <Card variant="surface" padded={false} style={{ marginTop: theme.spacing.base }}>
            <View style={[styles.tableHead, { borderBottomColor: theme.colors.divider, padding: theme.spacing.md }]}>
              <AppText variant="overline" color="textTertiary" style={styles.featureCol}>
                Feature
              </AppText>
              <AppText variant="overline" color="textTertiary" style={styles.valueCol}>
                Free
              </AppText>
              <AppText variant="overline" tint={theme.colors.premium} style={styles.valueCol}>
                Premium
              </AppText>
            </View>

            {COMPARISON.map((row, index) => (
              <View
                key={row.feature}
                style={[
                  styles.tableRow,
                  {
                    padding: theme.spacing.md,
                    borderBottomWidth: index === COMPARISON.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: theme.colors.divider,
                  },
                ]}
              >
                <AppText variant="bodySm" style={styles.featureCol}>
                  {row.feature}
                </AppText>
                <View style={styles.valueCol}>
                  <CellValue value={row.free} />
                </View>
                <View style={styles.valueCol}>
                  <CellValue value={row.premium} premium />
                </View>
              </View>
            ))}
          </Card>
        </View>

        {/* Store terms */}
        <View style={{ marginTop: theme.spacing.xl }}>
          <AppText variant="caption" color="textTertiary" style={styles.legal}>
            Payment is charged to your store account at confirmation of purchase. Subscriptions renew
            automatically unless auto-renew is turned off at least 24 hours before the end of the
            current period. Manage or cancel your subscription in your account settings after
            purchase.
          </AppText>
          <View style={[styles.legalLinks, { marginTop: theme.spacing.md }]}>
            <Pressable onPress={() => void WebBrowser.openBrowserAsync(settings.legal.termsUrl)}>
              <AppText variant="captionStrong" color="primary">
                Terms
              </AppText>
            </Pressable>
            <AppText variant="caption" color="textTertiary">
              ·
            </AppText>
            <Pressable onPress={() => void WebBrowser.openBrowserAsync(settings.legal.privacyUrl)}>
              <AppText variant="captionStrong" color="primary">
                Privacy Policy
              </AppText>
            </Pressable>
          </View>
          <AppText variant="caption" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
            {settings.legal.riskDisclaimer}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

function CellValue({ value, premium }: { value: string | boolean; premium?: boolean }) {
  const theme = useTheme();
  if (typeof value === 'boolean') {
    return value ? (
      <Ionicons
        name="checkmark-circle"
        size={17}
        color={premium ? theme.colors.premium : theme.colors.profit}
      />
    ) : (
      <Ionicons name="remove" size={15} color={theme.colors.textDisabled} />
    );
  }
  return (
    <AppText variant="caption" color={premium ? 'textPrimary' : 'textSecondary'} center>
      {value}
    </AppText>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  crown: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5 },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
  planRight: { alignItems: 'flex-end' },
  tableHead: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  featureCol: { flex: 2.2 },
  valueCol: { flex: 1, alignItems: 'center' },
  legal: { lineHeight: 16 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
