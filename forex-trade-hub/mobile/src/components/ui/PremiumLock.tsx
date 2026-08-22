import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';
import { Button } from './Button';
import { track } from '../../services/analytics';

export type PremiumLockProps = {
  /** The real content, rendered blurred underneath the lock. */
  children?: React.ReactNode;
  title?: string;
  message?: string;
  contentType: string;
  intensity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Premium gate.
 *
 * Shows the shape of what is behind the paywall — blurred, never readable —
 * with a single clear upgrade action. The blurred child is decorative only:
 * premium documents are blocked by security rules, so nothing sensitive is in
 * the tree to begin with.
 */
export function PremiumLock({
  children,
  title = 'Premium content',
  message = 'Upgrade to unlock full analysis, entries and targets.',
  contentType,
  intensity = 28,
  style,
}: PremiumLockProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.wrap, { borderRadius: theme.radius.lg }, style]}>
      {children ? (
        <View style={styles.behind} pointerEvents="none">
          {children}
        </View>
      ) : (
        <View style={[styles.behind, { height: 150, backgroundColor: theme.colors.surfaceAlt }]} />
      )}

      <BlurView
        intensity={intensity}
        tint={theme.isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={
          theme.isDark
            ? ['rgba(2,13,26,0.55)', 'rgba(2,13,26,0.92)']
            : ['rgba(255,255,255,0.55)', 'rgba(255,255,255,0.94)']
        }
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { padding: theme.spacing.lg }]}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: theme.colors.premiumMuted, borderRadius: theme.radius.md },
          ]}
        >
          <Ionicons name="lock-closed" size={20} color={theme.colors.premium} />
        </View>

        <AppText variant="title" center style={{ marginTop: theme.spacing.md }}>
          {title}
        </AppText>
        <AppText variant="bodySm" color="textSecondary" center style={{ marginTop: 4, maxWidth: 280 }}>
          {message}
        </AppText>

        <Button
          label="Unlock Premium"
          variant="premium"
          size="sm"
          icon="star"
          fullWidth={false}
          style={{ marginTop: theme.spacing.base }}
          onPress={() => {
            void track({ name: 'premium_content_locked', params: { content_type: contentType } });
            router.push('/premium');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', position: 'relative' },
  behind: { opacity: 0.7 },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
