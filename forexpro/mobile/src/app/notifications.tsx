import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from '../components/ui/AppText';
import { StackHeader } from '../components/ui/StackHeader';
import { ListItemSkeleton } from '../components/ui/Skeleton';
import { EmptyView, ErrorView } from '../components/ui/StateViews';
import { useNotifications } from '../hooks/useNotifications';
import { timeAgo } from '../utils/date';
import type { AppNotification, NotificationType } from '../types/models';

const ICON: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  new_signal: 'pulse',
  premium_signal: 'star',
  signal_update: 'swap-vertical',
  news: 'newspaper',
  lesson: 'school',
  poll: 'bar-chart',
  community: 'chatbubbles',
  announcement: 'megaphone',
  subscription: 'card',
  join_request: 'person-add',
};

/**
 * Notification centre.
 *
 * Tapping an item marks it read and follows its deep link, so the badge count
 * always reflects what the user has actually seen.
 */
export default function Notifications() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, loading, error, read, readAll, remove } = useNotifications();

  const unread = items.filter((n) => !n.read).length;

  const open = (item: AppNotification) => {
    if (!item.read) void read(item.id);
    if (item.route) router.push(item.route as never);
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : undefined}
        right={
          unread > 0 ? (
            <Pressable onPress={() => void readAll()} hitSlop={theme.hitSlop} accessibilityRole="button">
              <AppText variant="captionStrong" color="primary">
                Mark all read
              </AppText>
            </Pressable>
          ) : undefined
        }
      />

      {loading ? (
        <View style={{ padding: theme.layout.screenPadding, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <ListItemSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <ErrorView message={error} />
      ) : items.length === 0 ? (
        <EmptyView
          icon="notifications-off-outline"
          title="You're all caught up"
          message="New signals, announcements and community activity will show up here."
        />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingBottom: insets.bottom + 24,
          }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              onLongPress={() => void remove(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.body}`}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: item.read ? 'transparent' : theme.colors.primaryMuted,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.md,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.icon,
                  {
                    backgroundColor: item.read ? theme.colors.surfaceAlt : theme.colors.surface,
                    borderRadius: theme.radius.sm,
                  },
                ]}
              >
                <Ionicons
                  name={ICON[item.type]}
                  size={17}
                  color={item.read ? theme.colors.textTertiary : theme.colors.primary}
                />
              </View>

              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {item.title}
                </AppText>
                <AppText variant="bodySm" color="textSecondary" numberOfLines={2} style={{ marginTop: 2 }}>
                  {item.body}
                </AppText>
                <AppText variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
                  {timeAgo(item.createdAt)}
                </AppText>
              </View>

              {!item.read && <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />}
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
