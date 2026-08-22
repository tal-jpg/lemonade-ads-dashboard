import { useCallback, useEffect, useState } from 'react';
import type { Course, Lesson, LessonProgress, MarketQuote, NewsArticle, NewsCategory } from '../types/models';
import {
  fetchNewsPage,
  fetchNewsArticle,
  observeLatestNews,
  observeCourses,
  fetchCourse,
  fetchLessons,
  fetchLesson,
  type NewsCursor,
} from '../services/firebase/contentRepo';
import { observeProgress, markLessonComplete } from '../services/firebase/userRepo';
import { observeMarketQuotes } from '../services/firebase/settingsRepo';
import { useAuthStore, useIsPremium } from '../store/authStore';
import { toAppError } from '../utils/errors';
import { track } from '../services/analytics';

// ---------------------------------------------------------------------- news

export function useNewsFeed(category: NewsCategory | 'all') {
  const isPremium = useIsPremium();
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [cursor, setCursor] = useState<NewsCursor>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const page = await fetchNewsPage(category, isPremium, null);
        setItems(page.items);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      } catch (err) {
        setError(toAppError(err).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, isPremium],
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const page = await fetchNewsPage(category, isPremium, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setLoadingMore(false);
    }
  }, [category, cursor, hasMore, isPremium, loadingMore]);

  return {
    items,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refresh: () => load('refresh'),
    retry: () => load('initial'),
    loadMore,
  };
}

export function useLatestNews(count = 5) {
  const isPremium = useIsPremium();
  const [items, setItems] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeLatestNews(isPremium, count, (next) => {
      setItems(next);
      setLoading(false);
    });
  }, [count, isPremium]);

  return { items, loading };
}

export function useNewsArticle(id: string | undefined) {
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchNewsArticle(id);
      setArticle(next);
      if (next) {
        void track({ name: 'news_opened', params: { article_id: next.id, category: next.category } });
      }
    } catch (err) {
      const mapped = toAppError(err);
      setError(mapped.code === 'permission-denied' ? 'premium' : mapped.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return { article, loading, error, isLocked: error === 'premium', retry: load };
}

// ----------------------------------------------------------------- education

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return observeCourses(
      (next) => {
        setCourses(next);
        setLoading(false);
      },
      (err) => {
        setError(toAppError(err).message);
        setLoading(false);
      },
    );
  }, []);

  return { courses, loading, error };
}

export function useCourse(courseId: string | undefined) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const [c, l] = await Promise.all([fetchCourse(courseId), fetchLessons(courseId)]);
      setCourse(c);
      setLessons(l);
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { course, lessons, loading, error, retry: load };
}

export function useLesson(courseId: string | undefined, lessonId: string | undefined) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!courseId || !lessonId) return;
    setLoading(true);
    setError(null);
    try {
      setLesson(await fetchLesson(courseId, lessonId));
    } catch (err) {
      const mapped = toAppError(err);
      setError(mapped.code === 'permission-denied' ? 'premium' : mapped.message);
    } finally {
      setLoading(false);
    }
  }, [courseId, lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { lesson, loading, error, isLocked: error === 'premium', retry: load };
}

/** Lesson completion map for the signed-in user, keyed by lesson id. */
export function useProgress() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setProgress({});
      setLoading(false);
      return;
    }
    return observeProgress(uid, (next) => {
      setProgress(next);
      setLoading(false);
    });
  }, [uid]);

  const complete = useCallback(
    async (courseId: string, lessonId: string, score?: number) => {
      if (!uid) return;
      await markLessonComplete(uid, courseId, lessonId, score);
      void track({ name: 'lesson_completed', params: { course_id: courseId, lesson_id: lessonId } });
    },
    [uid],
  );

  const completedIn = useCallback(
    (courseId: string) =>
      Object.values(progress).filter((p) => p.courseId === courseId && p.completed).length,
    [progress],
  );

  return { progress, loading, complete, completedIn };
}

// ------------------------------------------------------------- market quotes

export function useMarketQuotes() {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeMarketQuotes((next, demo) => {
      setQuotes(next);
      setIsDemo(demo);
      setLoading(false);
    });
  }, []);

  return { quotes, isDemo, loading };
}
