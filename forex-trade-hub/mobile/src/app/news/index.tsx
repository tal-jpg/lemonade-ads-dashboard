import React, { useState } from 'react';
import { View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { StackHeader } from '../../components/ui/StackHeader';
import { Segmented } from '../../components/ui/Segmented';
import { ListItemSkeleton } from '../../components/ui/Skeleton';
import { EmptyView, ErrorView, LoadingView } from '../../components/ui/StateViews';
import { NewsCard, NEWS_CATEGORY_LABEL } from '../../components/news/NewsCard';
import { useNewsFeed } from '../../hooks/useContent';
import type { NewsCategory } from '../../types/models';

const CATEGORIES: { value: NewsCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  ...(Object.keys(NEWS_CATEGORY_LABEL) as NewsCategory[]).map((c) => ({
    value: c,
    label: NEWS_CATEGORY_LABEL[c],
  })),
];

export default function NewsFeed() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<NewsCategory | 'all'>('all');
  const { items, loading, refreshing, loadingMore, error, refresh, retry, loadMore, hasMore } =
    useNewsFeed(category);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <StackHeader title="Market news" />

      <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingVertical: 10 }}>
        <Segmented scrollable value={category} onChange={setCategory} options={CATEGORIES} />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: theme.layout.screenPadding, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <ListItemSkeleton key={i} lines={3} />
          ))}
        </View>
      ) : error ? (
        <ErrorView message={error} onRetry={retry} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingBottom: insets.bottom + 24,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => <NewsCard article={item} />}
          refreshing={refreshing}
          onRefresh={refresh}
          onEndReached={hasMore ? loadMore : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <LoadingView /> : null}
          ListEmptyComponent={
            <EmptyView
              icon="newspaper-outline"
              title="No news available"
              message="Nothing has been published in this category yet."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}
