import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen } from '../../components/ui/Screen';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Segmented } from '../../components/ui/Segmented';
import { ListItemSkeleton } from '../../components/ui/Skeleton';
import { EmptyView, ErrorView } from '../../components/ui/StateViews';
import { ProgressBar } from '../../components/ui/Common';
import { CourseCard, COURSE_CATEGORY_LABEL } from '../../components/learn/CourseCard';
import { useCourses, useProgress } from '../../hooks/useContent';
import { progressPct } from '../../utils/format';
import type { CourseCategory } from '../../types/models';

type Filter = 'all' | CourseCategory;

/**
 * Education library.
 *
 * Overall progress sits at the top because completion is the thing that keeps
 * people coming back to a course.
 */
export default function Learn() {
  const theme = useTheme();
  const { courses, loading, error } = useCourses();
  const { progress, completedIn } = useProgress();
  const [filter, setFilter] = useState<Filter>('all');

  const categories = useMemo(() => {
    const present = Array.from(new Set(courses.map((c) => c.category)));
    return [
      { value: 'all' as Filter, label: 'All' },
      ...present.map((c) => ({ value: c as Filter, label: COURSE_CATEGORY_LABEL[c] })),
    ];
  }, [courses]);

  const filtered = filter === 'all' ? courses : courses.filter((c) => c.category === filter);

  const totalLessons = courses.reduce((sum, c) => sum + c.lessonCount, 0);
  const totalDone = Object.values(progress).filter((p) => p.completed).length;

  return (
    <Screen scroll tabBarPadding>
      <AppText variant="h1" style={{ paddingTop: theme.spacing.base }}>
        Learn
      </AppText>
      <AppText variant="bodySm" color="textSecondary" style={{ marginTop: 4 }}>
        From the basics to SMC, ICT and trading psychology.
      </AppText>

      {totalLessons > 0 && (
        <Card variant="flat" style={{ marginTop: theme.spacing.base }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="captionStrong" color="textSecondary">
              Your progress
            </AppText>
            <AppText variant="captionStrong">
              {totalDone} / {totalLessons} lessons
            </AppText>
          </View>
          <ProgressBar value={progressPct(totalDone, totalLessons)} style={{ marginTop: 10 }} />
        </Card>
      )}

      {categories.length > 1 && (
        <Segmented
          scrollable
          style={{ marginTop: theme.spacing.base }}
          value={filter}
          onChange={setFilter}
          options={categories}
        />
      )}

      <View style={{ marginTop: theme.spacing.base, gap: 12 }}>
        {loading ? (
          [0, 1, 2].map((i) => <ListItemSkeleton key={i} lines={3} />)
        ) : error ? (
          <ErrorView message={error} />
        ) : filtered.length === 0 ? (
          <EmptyView
            icon="school-outline"
            title="No courses yet"
            message="New lessons are published every week. Check back soon."
          />
        ) : (
          filtered.map((course) => (
            <CourseCard key={course.id} course={course} completed={completedIn(course.id)} />
          ))
        )}
      </View>
    </Screen>
  );
}
