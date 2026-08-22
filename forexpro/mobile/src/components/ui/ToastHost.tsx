import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';
import { useUIStore, type Toast } from '../../store/uiStore';

/**
 * Toast overlay.
 *
 * Mounted once at the root. Toasts stack from the top, auto-dismiss on their
 * own timer and animate out — never blocking interaction underneath.
 */
export function ToastHost() {
  const toasts = useUIStore((s) => s.toasts);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.host, { top: insets.top + 8 }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastRow key={toast.id} toast={toast} />
      ))}
    </View>
  );
}

function ToastRow({ toast }: { toast: Toast }) {
  const theme = useTheme();
  const dismiss = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [dismiss, toast.duration, toast.id]);

  const config = {
    success: { icon: 'checkmark-circle' as const, tint: theme.colors.profit },
    error: { icon: 'alert-circle' as const, tint: theme.colors.loss },
    info: { icon: 'information-circle' as const, tint: theme.colors.info },
  }[toast.kind];

  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(180)}
      style={[
        styles.toast,
        theme.elevation.raised,
        {
          backgroundColor: theme.colors.surfaceHigh,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.md,
          paddingHorizontal: theme.spacing.base,
        },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name={config.icon} size={18} color={config.tint} />
      <AppText variant="bodySm" style={styles.text}>
        {toast.message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1 },
});
