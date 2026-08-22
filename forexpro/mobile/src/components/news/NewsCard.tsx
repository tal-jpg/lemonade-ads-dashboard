import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Badge, PremiumBadge } from '../ui/Badge';
import { timeAgo } from '../../utils/date';
import type { NewsArticle, NewsCategory } from '../../types/models';

export const NEWS_CATEGORY_LABEL: Record<NewsCategory, string> = {
  forex: 'Forex',
  economy: 'Economy',
  central_banks: 'Central Banks',
  interest_rates: 'Interest Rates',
  gold: 'Gold',
  usd: 'USD',
  global_markets: 'Global Markets',
};

/** Full-width article row for the news feed. */
export function NewsCard({ article }: { article: NewsArticle }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Card variant="surface" padded={false} onPress={() => router.push(`/news/${article.id}`)}>
      <View style={styles.row}>
        {article.imageUrl ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.thumb}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Ionicons name="newspaper-outline" size={22} color={theme.colors.textTertiary} />
          </View>
        )}

        <View style={[styles.body, { padding: theme.spacing.md }]}>
          <View style={styles.meta}>
            <Badge label={NEWS_CATEGORY_LABEL[article.category]} tone="info" />
            {article.isPremium && <PremiumBadge />}
          </View>

          <AppText variant="bodyStrong" numberOfLines={2} style={{ marginTop: 6 }}>
            {article.title}
          </AppText>

          <View style={[styles.meta, { marginTop: 6 }]}>
            <AppText variant="caption" color="textTertiary">
              {timeAgo(article.publishedAt)}
            </AppText>
            {article.source ? (
              <>
                <View style={[styles.dot, { backgroundColor: theme.colors.textTertiary }]} />
                <AppText variant="caption" color="textTertiary" numberOfLines={1}>
                  {article.source}
                </AppText>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

/** Compact tile used in the home carousel. */
export function NewsTile({ article }: { article: NewsArticle }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Card
      variant="surface"
      padded={false}
      onPress={() => router.push(`/news/${article.id}`)}
      style={styles.tile}
    >
      {article.imageUrl ? (
        <Image source={{ uri: article.imageUrl }} style={styles.tileImage} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.tileImage, styles.thumbFallback, { backgroundColor: theme.colors.surfaceAlt }]}>
          <Ionicons name="newspaper-outline" size={20} color={theme.colors.textTertiary} />
        </View>
      )}
      <View style={{ padding: theme.spacing.md }}>
        <AppText variant="overline" color="info">
          {NEWS_CATEGORY_LABEL[article.category]}
        </AppText>
        <AppText variant="captionStrong" numberOfLines={2} style={{ marginTop: 4, lineHeight: 17 }}>
          {article.title}
        </AppText>
        <AppText variant="caption" color="textTertiary" style={{ marginTop: 6 }}>
          {timeAgo(article.publishedAt)}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  thumb: { width: 96, height: 96 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 2.5, height: 2.5, borderRadius: 2 },
  tile: { width: 210 },
  tileImage: { width: '100%', height: 96 },
});
