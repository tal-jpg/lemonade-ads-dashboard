import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../../components/ui/AppText';
import { StackHeader } from '../../components/ui/StackHeader';
import { Badge, PremiumBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorView } from '../../components/ui/StateViews';
import { PremiumLock } from '../../components/ui/PremiumLock';
import { NEWS_CATEGORY_LABEL } from '../../components/news/NewsCard';
import { useNewsArticle } from '../../hooks/useContent';
import { dateTimeLabel } from '../../utils/date';

export default function NewsArticleScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { article, loading, error, isLocked, retry } = useNewsArticle(id);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Article" />
        <View style={{ padding: theme.layout.screenPadding, gap: 12 }}>
          <Skeleton height={180} radius={theme.radius.lg} />
          <Skeleton width="80%" height={22} />
          <Skeleton height={12} />
          <Skeleton height={12} />
          <Skeleton width="60%" height={12} />
        </View>
      </View>
    );
  }

  if (isLocked) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Premium article" />
        <View style={{ padding: theme.layout.screenPadding }}>
          <PremiumLock
            contentType="news"
            title="Premium analysis"
            message="Upgrade to read the full market analysis and daily commentary."
          />
        </View>
      </View>
    );
  }

  if (error || !article) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Article" />
        <ErrorView title="Article unavailable" message={error ?? undefined} onRetry={retry} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title={NEWS_CATEGORY_LABEL[article.category]} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {article.imageUrl && (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.hero}
            contentFit="cover"
            transition={220}
            cachePolicy="memory-disk"
          />
        )}

        <View style={{ padding: theme.layout.screenPadding }}>
          <View style={styles.meta}>
            <Badge label={NEWS_CATEGORY_LABEL[article.category]} tone="info" />
            {article.isPremium && <PremiumBadge />}
          </View>

          <AppText variant="h1" style={{ marginTop: theme.spacing.md }}>
            {article.title}
          </AppText>

          <AppText variant="caption" color="textTertiary" style={{ marginTop: 8 }}>
            {dateTimeLabel(article.publishedAt)}
            {article.source ? ` · ${article.source}` : ''}
          </AppText>

          {article.summary ? (
            <AppText
              variant="subtitle"
              color="textSecondary"
              style={{ marginTop: theme.spacing.base, lineHeight: 23 }}
            >
              {article.summary}
            </AppText>
          ) : null}

          <AppText variant="body" style={{ marginTop: theme.spacing.base, lineHeight: 24 }}>
            {article.body}
          </AppText>

          {article.sourceUrl ? (
            <Button
              label="Read at the source"
              variant="secondary"
              size="sm"
              icon="open-outline"
              style={{ marginTop: theme.spacing.xl }}
              onPress={() => void WebBrowser.openBrowserAsync(article.sourceUrl as string)}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { width: '100%', height: 210 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
