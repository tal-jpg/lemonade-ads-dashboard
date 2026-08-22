import {
  onSnapshot,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from '@react-native-firebase/firestore';
import { refs } from './paths';
import { mapNews, mapCourse, mapLesson } from './mappers';
import type { Course, Lesson, NewsArticle, NewsCategory } from '../../types/models';
import { serviceError } from '../../utils/errors';
import { DEMO_MODE } from '../../config/demo';
import * as demo from '../demo/repos';

/**
 * News and education content.
 */

const NEWS_PAGE = 15;

export type NewsCursor = QueryDocumentSnapshot<DocumentData> | null;

// ---------------------------------------------------------------------- news

function newsQuery(category: NewsCategory | 'all', canReadPremium: boolean) {
  return query(
    refs.news(),
    where('status', '==', 'published'),
    ...(category === 'all' ? [] : [where('category', '==', category)]),
    ...(canReadPremium ? [] : [where('isPremium', '==', false)]),
    orderBy('publishedAt', 'desc'),
  );
}

export function observeLatestNews(
  canReadPremium: boolean,
  count: number,
  onData: (news: NewsArticle[]) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeLatestNews(canReadPremium, count, onData);
  return onSnapshot(
    query(newsQuery('all', canReadPremium), limit(count)),
    (snap) => onData(snap.docs.map(mapNews).filter((n): n is NewsArticle => n !== null)),
    (err) => onError?.(err),
  );
}

export async function fetchNewsPage(
  category: NewsCategory | 'all',
  canReadPremium: boolean,
  cursor: NewsCursor,
): Promise<{ items: NewsArticle[]; cursor: NewsCursor; hasMore: boolean }> {
  if (DEMO_MODE) return demo.fetchNewsPage(category, canReadPremium);
  try {
    const base = newsQuery(category, canReadPremium);
    const q = cursor ? query(base, startAfter(cursor), limit(NEWS_PAGE)) : query(base, limit(NEWS_PAGE));
    const snap = await getDocs(q);
    return {
      items: snap.docs.map(mapNews).filter((n): n is NewsArticle => n !== null),
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : null,
      hasMore: snap.docs.length === NEWS_PAGE,
    };
  } catch (err) {
    throw serviceError(err, 'Could not load the news feed.');
  }
}

export async function fetchNewsArticle(id: string): Promise<NewsArticle | null> {
  if (DEMO_MODE) return demo.fetchNewsArticle(id);
  try {
    return mapNews(await getDoc(refs.newsArticle(id)));
  } catch (err) {
    throw serviceError(err, 'Could not load this article.');
  }
}

// ----------------------------------------------------------------- education

export function observeCourses(
  onData: (courses: Course[]) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeCourses(onData);
  const q = query(refs.courses(), where('status', '==', 'published'), orderBy('order', 'asc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(mapCourse).filter((c): c is Course => c !== null)),
    (err) => onError?.(err),
  );
}

export async function fetchCourse(id: string): Promise<Course | null> {
  if (DEMO_MODE) return demo.fetchCourse(id);
  try {
    return mapCourse(await getDoc(refs.course(id)));
  } catch (err) {
    throw serviceError(err, 'Could not load this course.');
  }
}

export async function fetchLessons(courseId: string): Promise<Lesson[]> {
  if (DEMO_MODE) return demo.fetchLessons(courseId);
  try {
    const snap = await getDocs(query(refs.lessons(courseId), orderBy('order', 'asc')));
    return snap.docs
      .map((d) => mapLesson(d, courseId))
      .filter((l): l is Lesson => l !== null);
  } catch (err) {
    throw serviceError(err, 'Could not load the lessons.');
  }
}

export async function fetchLesson(courseId: string, lessonId: string): Promise<Lesson | null> {
  if (DEMO_MODE) return demo.fetchLesson(courseId, lessonId);
  try {
    return mapLesson(await getDoc(refs.lesson(courseId, lessonId)), courseId);
  } catch (err) {
    throw serviceError(err, 'Could not load this lesson.');
  }
}
