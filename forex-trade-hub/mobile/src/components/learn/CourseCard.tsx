import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Badge, PremiumBadge } from '../ui/Badge';
import { ProgressBar } from '../ui/Common';
import { progressPct } from '../../utils/format';
import type { Course, CourseCategory, Lesson, LessonProgress } from '../../types/models';

export const COURSE_CATEGORY_LABEL: Record<CourseCategory, string> = {
  forex_basics: 'Forex Basics',
  technical_analysis: 'Technical Analysis',
  fundamental_analysis: 'Fundamental Analysis',
  smc: 'SMC',
  ict: 'ICT',
  risk_management: 'Risk Management',
  trading_psychology: 'Trading Psychology',
  advanced: 'Advanced Trading',
};

const LEVEL_TONE = { beginner: 'profit', intermediate: 'info', advanced: 'warning' } as const;

export function CourseCard({ course, completed }: { course: Course; completed: number }) {
  const theme = useTheme();
  const router = useRouter();
  const pct = progressPct(completed, course.lessonCount);

  return (
    <Card variant="surface" padded={false} onPress={() => router.push(`/course/${course.id}`)}>
      <View style={styles.row}>
        {course.coverUrl ? (
          <Image source={{ uri: course.coverUrl }} style={styles.cover} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.cover, styles.coverFallback, { backgroundColor: theme.colors.primaryMuted }]}>
            <Ionicons name="school-outline" size={24} color={theme.colors.primary} />
          </View>
        )}

        <View style={[styles.body, { padding: theme.spacing.md }]}>
          <View style={styles.meta}>
            <Badge label={COURSE_CATEGORY_LABEL[course.category]} tone="primary" />
            {course.isPremium && <PremiumBadge />}
          </View>

          <AppText variant="bodyStrong" numberOfLines={2} style={{ marginTop: 6 }}>
            {course.title}
          </AppText>

          <View style={[styles.meta, { marginTop: 6 }]}>
            <Badge label={course.level} tone={LEVEL_TONE[course.level]} />
            <AppText variant="caption" color="textTertiary">
              {course.lessonCount} lesson{course.lessonCount === 1 ? '' : 's'} · {course.estimatedMinutes} min
            </AppText>
          </View>

          {completed > 0 && (
            <View style={{ marginTop: 10 }}>
              <ProgressBar value={pct} height={4} />
              <AppText variant="caption" color="textTertiary" style={{ marginTop: 4 }}>
                {completed} of {course.lessonCount} complete
              </AppText>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const LESSON_ICON: Record<Lesson['type'], keyof typeof Ionicons.glyphMap> = {
  text: 'document-text-outline',
  video: 'play-circle-outline',
  pdf: 'document-attach-outline',
  quiz: 'help-circle-outline',
};

export function LessonRow({
  lesson,
  index,
  progress,
  locked,
  onPress,
}: {
  lesson: Lesson;
  index: number;
  progress?: LessonProgress;
  locked: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const done = progress?.completed ?? false;

  return (
    <Card variant="flat" onPress={onPress} testID={`lesson-${lesson.id}`}>
      <View style={styles.lessonRow}>
        <View
          style={[
            styles.lessonIndex,
            {
              backgroundColor: done ? theme.colors.primaryMuted : theme.colors.surfaceHigh,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
          ) : locked ? (
            <Ionicons name="lock-closed" size={14} color={theme.colors.textTertiary} />
          ) : (
            <AppText variant="captionStrong" color="textSecondary">
              {index + 1}
            </AppText>
          )}
        </View>

        <View style={styles.body}>
          <AppText variant="bodyStrong" numberOfLines={1} color={locked ? 'textSecondary' : 'textPrimary'}>
            {lesson.title}
          </AppText>
          <View style={[styles.meta, { marginTop: 3 }]}>
            <Ionicons name={LESSON_ICON[lesson.type]} size={13} color={theme.colors.textTertiary} />
            <AppText variant="caption" color="textTertiary">
              {lesson.type === 'quiz' ? 'Quiz' : `${lesson.durationMinutes} min`}
            </AppText>
            {lesson.isPremium && <PremiumBadge />}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cover: { width: 104, height: 118 },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lessonIndex: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
