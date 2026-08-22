import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../../../theme/ThemeProvider';
import { AppText } from '../../../../components/ui/AppText';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { StackHeader } from '../../../../components/ui/StackHeader';
import { Badge } from '../../../../components/ui/Badge';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { ErrorView } from '../../../../components/ui/StateViews';
import { PremiumLock } from '../../../../components/ui/PremiumLock';
import { useLesson, useProgress } from '../../../../hooks/useContent';
import { useIsPremium } from '../../../../store/authStore';
import { toast } from '../../../../store/uiStore';
import type { QuizQuestion } from '../../../../types/models';

/**
 * Lesson viewer: text, video, PDF or quiz, with completion tracking.
 */
export default function LessonScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: courseId, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();

  const { lesson, loading, error, isLocked, retry } = useLesson(courseId, lessonId);
  const { progress, complete } = useProgress();
  const isPremium = useIsPremium();

  const done = lessonId ? progress[lessonId]?.completed : false;
  const gated = (lesson?.isPremium && !isPremium) || isLocked;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Lesson" />
        <View style={{ padding: theme.layout.screenPadding, gap: 12 }}>
          <Skeleton width="70%" height={24} />
          <Skeleton height={12} />
          <Skeleton height={12} />
          <Skeleton width="50%" height={12} />
        </View>
      </View>
    );
  }

  if (error && !isLocked) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Lesson" />
        <ErrorView title="Lesson unavailable" message={error} onRetry={retry} />
      </View>
    );
  }

  if (gated || !lesson) {
    return (
      <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
        <StackHeader title="Premium lesson" />
        <View style={{ padding: theme.layout.screenPadding }}>
          <PremiumLock
            contentType="lesson"
            title="Premium lesson"
            message="Upgrade to unlock the complete course, including SMC, ICT, psychology and risk management."
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <StackHeader
        title={lesson.title}
        right={done ? <Badge label="Completed" tone="profit" icon="checkmark-circle" /> : undefined}
      />

      <ScrollView
        contentContainerStyle={{
          padding: theme.layout.screenPadding,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="h2">{lesson.title}</AppText>
        {lesson.summary ? (
          <AppText variant="subtitle" color="textSecondary" style={{ marginTop: 6 }}>
            {lesson.summary}
          </AppText>
        ) : null}

        {lesson.type === 'video' && lesson.videoUrl ? (
          <LessonVideo url={lesson.videoUrl} />
        ) : null}

        {lesson.type === 'pdf' && lesson.pdfUrl ? (
          <Card variant="surface" style={{ marginTop: theme.spacing.lg }}>
            <View style={styles.row}>
              <Ionicons name="document-attach-outline" size={22} color={theme.colors.primary} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">Lesson workbook</AppText>
                <AppText variant="caption" color="textTertiary">
                  Opens in your browser
                </AppText>
              </View>
            </View>
            <Button
              label="Open PDF"
              variant="secondary"
              size="sm"
              icon="open-outline"
              style={{ marginTop: theme.spacing.md }}
              onPress={() => void WebBrowser.openBrowserAsync(lesson.pdfUrl as string)}
            />
          </Card>
        ) : null}

        {lesson.content ? (
          <AppText variant="body" style={{ marginTop: theme.spacing.lg, lineHeight: 25 }}>
            {lesson.content}
          </AppText>
        ) : null}

        {lesson.imageUrls?.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            style={[styles.image, { borderRadius: theme.radius.md, marginTop: theme.spacing.base }]}
            contentFit="cover"
            transition={200}
          />
        ))}

        {lesson.type === 'quiz' && lesson.quiz && lesson.quiz.length > 0 ? (
          <Quiz
            questions={lesson.quiz}
            onFinish={(score) => {
              void complete(lesson.courseId, lesson.id, score);
              toast.success(`Quiz complete — ${score}%`);
            }}
          />
        ) : (
          <Button
            label={done ? 'Completed' : 'Mark as complete'}
            variant={done ? 'secondary' : 'primary'}
            icon={done ? 'checkmark-circle' : undefined}
            disabled={done}
            style={{ marginTop: theme.spacing.xl }}
            onPress={() => {
              void complete(lesson.courseId, lesson.id);
              toast.success('Lesson complete');
              router.back();
            }}
          />
        )}
      </ScrollView>
    </View>
  );
}

function LessonVideo({ url }: { url: string }) {
  const theme = useTheme();
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });

  return (
    <View style={[styles.video, { borderRadius: theme.radius.md, marginTop: theme.spacing.lg }]}>
      <VideoView
        player={player}
        style={styles.videoInner}
        nativeControls
        allowsPictureInPicture
        contentFit="contain"
      />
    </View>
  );
}

/**
 * Inline quiz. Answers are revealed only after submission, with the explanation
 * shown for each question — the point is learning, not scoring.
 */
function Quiz({
  questions,
  onFinish,
}: {
  questions: QuizQuestion[];
  onFinish: (score: number) => void;
}) {
  const theme = useTheme();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const answered = Object.keys(answers).length;
  const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const score = Math.round((correct / questions.length) * 100);

  return (
    <View style={{ marginTop: theme.spacing.xl, gap: 12 }}>
      <AppText variant="h3">Check your understanding</AppText>

      {questions.map((question, qIndex) => (
        <Card key={question.id} variant="surface">
          <AppText variant="bodyStrong">
            {qIndex + 1}. {question.question}
          </AppText>

          <View style={{ marginTop: theme.spacing.md, gap: 8 }}>
            {question.options.map((option, index) => {
              const chosen = answers[question.id] === index;
              const isCorrect = index === question.correctIndex;
              const showResult = submitted;

              const borderColor = showResult
                ? isCorrect
                  ? theme.colors.profit
                  : chosen
                    ? theme.colors.loss
                    : theme.colors.border
                : chosen
                  ? theme.colors.primary
                  : theme.colors.border;

              return (
                <Pressable
                  key={option}
                  disabled={submitted}
                  onPress={() => setAnswers((prev) => ({ ...prev, [question.id]: index }))}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  style={[
                    styles.option,
                    { borderColor, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceAlt },
                  ]}
                >
                  <Ionicons
                    name={
                      showResult
                        ? isCorrect
                          ? 'checkmark-circle'
                          : chosen
                            ? 'close-circle'
                            : 'ellipse-outline'
                        : chosen
                          ? 'radio-button-on'
                          : 'radio-button-off'
                    }
                    size={17}
                    color={
                      showResult
                        ? isCorrect
                          ? theme.colors.profit
                          : chosen
                            ? theme.colors.loss
                            : theme.colors.textTertiary
                        : chosen
                          ? theme.colors.primary
                          : theme.colors.textTertiary
                    }
                  />
                  <AppText variant="bodySm" style={styles.flex}>
                    {option}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {submitted && question.explanation ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.explanation,
                { backgroundColor: theme.colors.infoMuted, borderRadius: theme.radius.sm },
              ]}
            >
              <Ionicons name="bulb-outline" size={15} color={theme.colors.info} />
              <AppText variant="caption" color="textSecondary" style={styles.flex}>
                {question.explanation}
              </AppText>
            </Animated.View>
          ) : null}
        </Card>
      ))}

      {submitted ? (
        <Card variant="surface">
          <AppText variant="h3" center>
            {score}%
          </AppText>
          <AppText variant="bodySm" color="textSecondary" center style={{ marginTop: 4 }}>
            {correct} of {questions.length} correct
          </AppText>
        </Card>
      ) : (
        <Button
          label={`Submit answers (${answered}/${questions.length})`}
          disabled={answered < questions.length}
          onPress={() => {
            setSubmitted(true);
            onFinish(Math.round((questions.filter((q) => answers[q.id] === q.correctIndex).length / questions.length) * 100));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: '100%', height: 200 },
  video: { width: '100%', height: 210, overflow: 'hidden', backgroundColor: '#000' },
  videoInner: { width: '100%', height: '100%' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1 },
  explanation: { flexDirection: 'row', gap: 8, padding: 10, marginTop: 10 },
});
