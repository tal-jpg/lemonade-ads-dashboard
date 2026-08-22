import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';
import { Button } from './Button';

/**
 * Loading, empty and error states.
 *
 * Every list and screen in the app renders one of these instead of a blank
 * area — the rule is: no screen may ever show nothing.
 */

export function LoadingView({ label }: { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={theme.colors.primary} />
      {label && (
        <AppText variant="bodySm" color="textTertiary" style={{ marginTop: theme.spacing.md }}>
          {label}
        </AppText>
      )}
    </View>
  );
}

export type EmptyViewProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
};

export function EmptyView({
  icon = 'file-tray-outline',
  title,
  message,
  actionLabel,
  onAction,
  compact,
}: EmptyViewProps) {
  const theme = useTheme();
  return (
    <View style={[styles.center, compact && styles.compact]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
        ]}
      >
        <Ionicons name={icon} size={26} color={theme.colors.textTertiary} />
      </View>
      <AppText variant="title" center style={{ marginTop: theme.spacing.base }}>
        {title}
      </AppText>
      {message && (
        <AppText
          variant="bodySm"
          color="textTertiary"
          center
          style={{ marginTop: 6, maxWidth: 300 }}
        >
          {message}
        </AppText>
      )}
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          fullWidth={false}
          style={{ marginTop: theme.spacing.lg }}
        />
      )}
    </View>
  );
}

export type ErrorViewProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function ErrorView({
  title = 'Something went wrong',
  message = 'We could not load this right now.',
  onRetry,
  compact,
}: ErrorViewProps) {
  const theme = useTheme();
  return (
    <View style={[styles.center, compact && styles.compact]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: theme.colors.lossMuted, borderColor: 'transparent' },
        ]}
      >
        <Ionicons name="cloud-offline-outline" size={26} color={theme.colors.loss} />
      </View>
      <AppText variant="title" center style={{ marginTop: theme.spacing.base }}>
        {title}
      </AppText>
      <AppText variant="bodySm" color="textTertiary" center style={{ marginTop: 6, maxWidth: 300 }}>
        {message}
      </AppText>
      {onRetry && (
        <Button
          label="Try again"
          icon="refresh"
          onPress={onRetry}
          variant="secondary"
          size="sm"
          fullWidth={false}
          style={{ marginTop: theme.spacing.lg }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  compact: { paddingVertical: 28 },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
