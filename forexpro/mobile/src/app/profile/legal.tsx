import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { StackHeader } from '../../components/ui/StackHeader';
import { DetailRow, Divider, SectionHeader } from '../../components/ui/Common';
import { useAppSettings } from '../../hooks/useAppSettings';

const POINTS = [
  'All signals, analysis and lessons are educational and informational only. Nothing in this app is investment, financial, legal or tax advice.',
  'Trading foreign exchange, metals and CFDs carries a high level of risk and may not be suitable for every investor. You can lose more than your initial deposit.',
  'No profit is guaranteed. Any performance figure, win rate or result shown in this app is historical and does not guarantee future results.',
  'You are solely responsible for your own trading decisions, position sizing and risk management.',
  'FX Pulse is not a broker, does not execute trades and does not hold client funds.',
  'Before trading, consider your objectives, level of experience and risk appetite, and seek independent advice if you are unsure.',
];

/**
 * Risk disclosure. Deliberately plain, complete and easy to find — the app
 * makes no claim anywhere that this page has to walk back.
 */
export default function Legal() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const settings = useAppSettings();

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title="Risk disclosure" />

      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="surface" accentColor={theme.colors.warning}>
          <View style={styles.row}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
            <AppText variant="title" style={styles.flex}>
              Trading involves significant risk
            </AppText>
          </View>
          <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 8, lineHeight: 21 }}>
            {settings.legal.riskDisclaimer}
          </AppText>
        </Card>

        <SectionHeader title="In detail" style={{ marginTop: theme.spacing.xl }} />
        <Card variant="surface">
          <View style={{ gap: theme.spacing.md }}>
            {POINTS.map((point, index) => (
              <View key={point} style={styles.point}>
                <View
                  style={[
                    styles.bullet,
                    { backgroundColor: theme.colors.surfaceHigh, borderRadius: theme.radius.xs },
                  ]}
                >
                  <AppText variant="overline" color="textSecondary">
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="bodySm" color="textSecondary" style={[styles.flex, { lineHeight: 21 }]}>
                  {point}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        <SectionHeader title="Documents" style={{ marginTop: theme.spacing.xl }} />
        <Card variant="surface" padded={false}>
          <View style={{ paddingHorizontal: theme.spacing.base }}>
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
              label="Contact support"
              value=""
              icon="mail-outline"
              onPress={() =>
                void WebBrowser.openBrowserAsync(`mailto:${settings.legal.supportEmail}`)
              }
            />
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  point: { flexDirection: 'row', gap: 10 },
  bullet: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
});
