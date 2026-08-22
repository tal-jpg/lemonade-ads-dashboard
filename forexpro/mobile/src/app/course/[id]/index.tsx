import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeProvider';
import { AppText } from '../../../components/ui/AppText';
import { Card } from '../../../components/ui/Card';
import { StackHeader } from '../../../components/ui/StackHeader';
import { Badge, PremiumBadge } from '../../../components/ui/Badge';
import { ProgressBar, SectionHeader } from '../../../components/ui/Common';
import { ListItemSkeleton, Skeleton } from '../../../components/ui/Skeleton';
import { EmptyView, ErrorView } from '../../../components/ui/StateViews';
import { LessonRow, COURSE_CATEGORY_LABEL } from '../../../components/learn/CourseCard';
import { useCourse, useProgress } from '../../../hooks/useContent';
import { useIsPremium } from '../../../store/authStore';
import { progressPct } from '../../../utils/format';

/**
 * Course detail with its lesson list and per-lesson progress.
 */
export default function CourseDetail() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { course, lessons, loading, error, retry } = useCourse(id);
  const { progress } = useProgress();
  const isPremium = useIsPremium();

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Course" />
        <View style={{ padding: theme.layout.screenPadding, gap: 12 }}>
          <Skeleton height={150} radius={theme.radius.lg} />
          {[0, 1, 2].map((i) => (
            <ListItemSkeleton key={i} />
          ))}
        </View>
      </View>
    );
  }

  if (error || !course) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Course" />
        <ErrorView title="Course unavailable" message={error ?? undefined} onRetry={retry} />
      </View>
    );
  }

  const completed = lessons.filter((l) => progress[l.id]?.completed).length;
  const nextLesson = lessons.find((l) => !progress[l.id]?.completed) ?? lessons[0];

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader title={COURSE_CATEGORY_LABEL[course.category]} />

      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="surface" padded={false}>
          {course.coverUrl ? (
            <Image source={{ uri: course.coverUrl }} style={styles.cover} contentFit="cover" transition={220} />
          ) : (
            <View style={[styles.cover, styles.coverFallback, { backgroundColor: theme.colors.primaryMuted }]}>
              <Ionicons name="school" size={36} color={theme.colors.primary} />
            </View>
          )}

          <View style={{ padding: theme.spacing.base }}>
            <View style={styles.meta}>
              <Badge label={course.level} tone="info" />
              {course.isPremium && <PremiumBadge />}
            </View>

            <AppText variant="h2" style={{ marginTop: theme.spacing.sm }}>
              {course.title}
            </AppText>
            <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 6 }}>
              {course.description}
            </AppText>

            <View style={[styles.meta, { marginTop: theme.spacing.md }]}>
              <Ionicons name="book-outline" size={14} color={theme.colors.textTertiary} />
              <AppText variant="caption" color="textTertiary">
                {course.lessonCount} lessons · {course.estimatedMinutes} min
              </AppText>
            </View>

            {lessons.length > 0 && (
              <View style={{ marginTop: theme.spacing.base }}>
                <View style={styles.rowBetween}>
                  <AppText variant="caption" color="textSecondary">
                    {completed} of {lessons.length} complete
                  </AppText>
                  <AppText variant="captionStrong" color="primary">
                    {Math.round(progressPct(completed, lessons.length))}%
                  </AppText>
                </View>
                <ProgressBar
                  value={progressPct(completed, lessons.length)}
                  style={{ marginTop: 6 }}
                />
              </View>
            )}
          </View>
        </Card>

        <View style={{ marginTop: theme.spacing.xl }}>
          <SectionHeader
            title="Lessons"
            actionLabel={nextLesson ? 'Continue' : undefined}
            onAction={
              nextLesson
                ? () => router.push(`/course/${course.id}/lesson/${nextLesson.id}`)
                : undefined
            }
          />

          {lessons.length === 0 ? (
            <EmptyView icon="book-outline" title="No lessons yet" compact />
          ) : (
            <View style={{ gap: 8 }}>
              {lessons.map((lesson, index) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  index={index}
                  progress={progress[lesson.id]}
                  locked={lesson.isPremium && !isPremium}
                  onPress={() => router.push(`/course/${course.id}/lesson/${lesson.id}`)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: { width: '100%', height: 150 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
