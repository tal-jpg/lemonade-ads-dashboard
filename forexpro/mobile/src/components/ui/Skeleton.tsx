import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shimmering placeholder.
 *
 * Skeletons mirror the real layout of the content they stand in for, so the
 * page does not reflow when data lands — the single biggest contributor to an
 * app feeling "cheap" while loading.
 */
export function Skeleton({ width = '100%', height = 14, radius, style }: SkeletonProps) {
  const theme = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 1]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.xs,
          backgroundColor: theme.colors.skeleton,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Skeleton shaped like a signal card. */
export function SignalCardSkeleton() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.base,
        },
      ]}
    >
      <View style={styles.row}>
        <Skeleton width={92} height={20} radius={6} />
        <Skeleton width={56} height={20} radius={6} />
      </View>
      <Skeleton width="55%" height={26} style={{ marginTop: 14 }} />
      <View style={[styles.row, { marginTop: 18 }]}>
        <Skeleton width="30%" height={34} radius={8} />
        <Skeleton width="30%" height={34} radius={8} />
        <Skeleton width="30%" height={34} radius={8} />
      </View>
    </View>
  );
}

export function ListItemSkeleton({ lines = 2 }: { lines?: number }) {
  const theme = useTheme();
  return (
    <View style={[styles.listItem, { paddingVertical: theme.spacing.md }]}>
      <Skeleton width={48} height={48} radius={12} />
      <View style={styles.listBody}>
        <Skeleton width="70%" height={13} />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} width={i % 2 === 0 ? '90%' : '45%'} height={11} style={{ marginTop: 8 }} />
        ))}
      </View>
    </View>
  );
}

export function SkeletonList({ count = 4, children }: { count?: number; children?: React.ReactNode }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>{children ?? <ListItemSkeleton />}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItem: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  listBody: { flex: 1 },
});
