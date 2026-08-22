import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, PremiumBadge, RoleBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Divider, DetailRow, ProgressBar, SectionHeader } from '../../components/ui/Common';
import { useAuthStore, useIsPremium } from '../../store/authStore';
import { useAppSettings } from '../../hooks/useAppSettings';
import { signOut } from '../../services/firebase/authService';
import { unregisterDevice, leaveAllTopics } from '../../services/push';
import { toast } from '../../store/uiStore';
import { toAppError } from '../../utils/errors';
import { profileCompletion } from '../../types/models';
import { longDate, daysUntil } from '../../utils/date';
import { DEMO_MODE, DEMO_BANNER_TEXT } from '../../config/demo';
import { setDemoPlan } from '../../services/demo/db';

/**
 * Profile and settings hub.
 */
export default function Profile() {
  const theme = useTheme();
  const router = useRouter();
  const settings = useAppSettings();

  const profile = useAuthStore((s) => s.profile);
  const subscription = useAuthStore((s) => s.subscription);
  const claims = useAuthStore((s) => s.claims);
  const isPremium = useIsPremium();
  const [signingOut, setSigningOut] = useState(false);

  if (!profile) {
    return (
      <Screen scroll tabBarPadding>
        <AppText variant="h1" style={{ paddingTop: theme.spacing.base }}>
          Profile
        </AppText>
        <AppText variant="bodySm" color="textTertiary" style={{ marginTop: 12 }}>
          Loading your account…
        </AppText>
      </Screen>
    );
  }

  const completion = Math.round(profileCompletion(profile) * 100);

  const confirmSignOut = () => {
    Alert.alert('Sign out', 'You will stop receiving notifications on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await unregisterDevice();
            await leaveAllTopics();
            await signOut();
          } catch (err) {
            toast.error(toAppError(err).message);
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen scroll tabBarPadding>
      {/* Account status banners */}
      {claims.status !== 'active' && (
        <Card
          variant="surface"
          accentColor={theme.colors.loss}
          style={{ marginTop: theme.spacing.base }}
        >
          <View style={styles.row}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.loss} />
            <AppText variant="title" style={styles.flex}>
              Account {claims.status}
            </AppText>
          </View>
          <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 6 }}>
            {claims.status === 'suspended'
              ? 'Your account is temporarily suspended. Contact support for help.'
              : 'Your account has been banned. Contact support if you believe this is a mistake.'}
          </AppText>
          <Button
            label="Contact support"
            variant="secondary"
            size="sm"
            style={{ marginTop: theme.spacing.md }}
            onPress={() => void WebBrowser.openBrowserAsync(`mailto:${settings.legal.supportEmail}`)}
          />
        </Card>
      )}

      {/* Demo controls — only compiled into a demo build */}
      {DEMO_MODE && (
        <Card
          variant="surface"
          accentColor={theme.colors.info}
          style={{ marginTop: theme.spacing.base }}
        >
          <View style={styles.row}>
            <Ionicons name="flask-outline" size={18} color={theme.colors.info} />
            <AppText variant="title" style={styles.flex}>
              Demo build
            </AppText>
          </View>
          <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 6 }}>
            {DEMO_BANNER_TEXT}. Toggle the plan to see how the app changes between the free and
            premium experience — locked signals, gated lessons and the paywall all respond.
          </AppText>
          <View style={[styles.rowBetween, { marginTop: theme.spacing.base }]}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Premium access</AppText>
              <AppText variant="caption" color="textTertiary">
                {isPremium ? 'Everything unlocked' : 'Free tier limits applied'}
              </AppText>
            </View>
            <Switch
              value={isPremium}
              onValueChange={(next) => setDemoPlan(next ? 'premium' : 'free')}
              trackColor={{ true: theme.colors.premium, false: theme.colors.surfaceHigh }}
              thumbColor={theme.colors.textPrimary}
            />
          </View>
        </Card>
      )}

      {/* Identity */}
      <Card variant="surface" style={{ marginTop: theme.spacing.base }}>
        <View style={styles.identity}>
          <Avatar name={profile.fullName} uri={profile.photoURL} size={64} ring={isPremium} />
          <View style={styles.flex}>
            <View style={styles.row}>
              <AppText variant="h3" numberOfLines={1}>
                {profile.fullName}
              </AppText>
              <RoleBadge role={profile.role} />
            </View>
            <AppText variant="bodySm" color="textTertiary">
              @{profile.username}
            </AppText>
            <View style={[styles.row, { marginTop: 6 }]}>
              {isPremium ? <PremiumBadge /> : <Badge label="Free plan" tone="neutral" />}
            </View>
          </View>
        </View>

        {profile.bio ? (
          <AppText variant="bodySm" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
            {profile.bio}
          </AppText>
        ) : null}

        {completion < 100 && (
          <View style={{ marginTop: theme.spacing.base }}>
            <View style={styles.rowBetween}>
              <AppText variant="caption" color="textSecondary">
                Profile {completion}% complete
              </AppText>
              <AppText
                variant="captionStrong"
                color="primary"
                onPress={() => router.push('/profile/edit')}
              >
                Complete it
              </AppText>
            </View>
            <ProgressBar value={completion} height={4} style={{ marginTop: 6 }} />
          </View>
        )}

        <Button
          label="Edit profile"
          variant="secondary"
          size="sm"
          icon="create-outline"
          style={{ marginTop: theme.spacing.base }}
          onPress={() => router.push('/profile/edit')}
        />
      </Card>

      {/* Subscription */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Subscription" />
        <Card variant="surface" padded={false}>
          <View style={{ paddingHorizontal: theme.spacing.base }}>
            <DetailRow label="Plan" value={isPremium ? 'Premium' : 'Free'} icon="star-outline" />
            <Divider />
            <DetailRow
              label="Status"
              value={subscription?.status ? subscription.status.replace('_', ' ') : 'No subscription'}
              icon="pulse-outline"
            />
            {subscription?.expiresAt && (
              <>
                <Divider />
                <DetailRow
                  label={subscription.autoRenewing ? 'Renews' : 'Expires'}
                  value={`${longDate(subscription.expiresAt)} (${daysUntil(subscription.expiresAt)}d)`}
                  icon="calendar-outline"
                />
              </>
            )}
          </View>
          <View style={{ padding: theme.spacing.base, paddingTop: theme.spacing.sm }}>
            <Button
              label={isPremium ? 'Manage subscription' : 'Upgrade to Premium'}
              variant={isPremium ? 'secondary' : 'premium'}
              size="sm"
              icon={isPremium ? 'settings-outline' : 'star'}
              onPress={() => router.push('/premium')}
            />
          </View>
        </Card>
      </View>

      {/* Account */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Account" />
        <Card variant="surface" padded={false}>
          <View style={{ paddingHorizontal: theme.spacing.base }}>
            <DetailRow label="Email" value={profile.email} icon="mail-outline" />
            <Divider />
            <DetailRow
              label="Member since"
              value={longDate(profile.createdAt)}
              icon="time-outline"
            />
            <Divider />
            <DetailRow
              label="Community"
              value={profile.community.status === 'approved' ? 'Approved' : profile.community.status}
              icon="people-outline"
            />
          </View>
        </Card>
      </View>

      {/* Settings */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Settings" />
        <Card variant="surface" padded={false}>
          <View style={{ paddingHorizontal: theme.spacing.base }}>
            <DetailRow
              label="Notifications"
              value=""
              icon="notifications-outline"
              onPress={() => router.push('/profile/notifications')}
            />
            <Divider />
            <DetailRow
              label="Appearance"
              value=""
              icon="color-palette-outline"
              onPress={() => router.push('/profile/settings')}
            />
            <Divider />
            <DetailRow
              label="Security"
              value=""
              icon="lock-closed-outline"
              onPress={() => router.push('/profile/security')}
            />
          </View>
        </Card>
      </View>

      {/* Support and legal */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Support" />
        <Card variant="surface" padded={false}>
          <View style={{ paddingHorizontal: theme.spacing.base }}>
            <DetailRow
              label="Contact support"
              value=""
              icon="help-buoy-outline"
              onPress={() =>
                void WebBrowser.openBrowserAsync(`mailto:${settings.legal.supportEmail}`)
              }
            />
            <Divider />
            <DetailRow
              label="Terms & Conditions"
              value=""
              icon="document-text-outline"
              onPress={() => void WebBrowser.openBrowserAsync(settings.legal.termsUrl)}
            />
            <Divider />
            <DetailRow
              label="Privacy Policy"
              value=""
              icon="shield-outline"
              onPress={() => void WebBrowser.openBrowserAsync(settings.legal.privacyUrl)}
            />
            <Divider />
            <DetailRow
              label="Risk disclosure"
              value=""
              icon="warning-outline"
              onPress={() => router.push('/profile/legal')}
            />
          </View>
        </Card>
      </View>

      {!DEMO_MODE && (
        <>
          <Button
            label="Sign out"
            variant="secondary"
            icon="log-out-outline"
            loading={signingOut}
            style={{ marginTop: theme.spacing.xl }}
            onPress={confirmSignOut}
          />

          <Button
            label="Delete account"
            variant="ghost"
            size="sm"
            style={{ marginTop: theme.spacing.sm }}
            onPress={() => router.push('/profile/delete-account')}
          />
        </>
      )}

      <AppText variant="caption" color="textTertiary" center style={{ marginTop: theme.spacing.lg }}>
        FX Pulse v1.0.0{DEMO_MODE ? ' · demo' : ''}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14 },
});
