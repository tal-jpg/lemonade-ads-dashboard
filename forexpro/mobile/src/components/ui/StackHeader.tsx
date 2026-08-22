import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from './AppText';

export type StackHeaderProps = {
  title?: string;
  subtitle?: string;
  /** Rendered on the right — actions, badges, an avatar. */
  right?: React.ReactNode;
  onBack?: () => void;
  transparent?: boolean;
  center?: boolean;
};

/**
 * Header for pushed screens.
 *
 * A single component rather than per-screen navigator options, so the back
 * affordance, title treatment and safe-area behaviour are identical everywhere.
 */
export function StackHeader({
  title,
  subtitle,
  right,
  onBack,
  transparent = false,
  center = false,
}: StackHeaderProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: transparent ? 'transparent' : theme.colors.bg,
          borderBottomColor: transparent ? 'transparent' : theme.colors.divider,
          borderBottomWidth: transparent ? 0 : StyleSheet.hairlineWidth,
          paddingHorizontal: theme.layout.screenPadding,
        },
      ]}
    >
      <Pressable
        onPress={() => (onBack ? onBack() : router.back())}
        hitSlop={theme.hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[
          styles.back,
          transparent && {
            backgroundColor: theme.colors.surfaceHigh,
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={22} color={theme.colors.textPrimary} />
      </Pressable>

      <View style={[styles.titles, center && styles.centered]}>
        {title && (
          <AppText variant="title" numberOfLines={1}>
            {title}
          </AppText>
        )}
        {subtitle && (
          <AppText variant="caption" color="textTertiary" numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>

      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
  },
  back: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  titles: { flex: 1 },
  centered: { alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 34, justifyContent: 'flex-end' },
});
