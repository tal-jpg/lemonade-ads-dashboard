import { collection, doc, collectionGroup } from '@react-native-firebase/firestore';
import { db } from './client';

/**
 * Single source of truth for every Firestore path in the app.
 *
 * Nothing else in the codebase types a collection name as a string literal, so
 * renaming a collection is one edit here plus a migration — never a hunt.
 */

export const COLLECTIONS = {
  users: 'users',
  usernames: 'usernames',
  subscriptions: 'subscriptions',
  signals: 'signals',
  dailyStats: 'daily_stats',
  dailyBriefs: 'daily_briefs',
  news: 'news',
  courses: 'courses',
  lessons: 'lessons',
  userProgress: 'user_progress',
  community: 'community',
  messages: 'messages',
  communityMembers: 'community_members',
  joinRequests: 'join_requests',
  polls: 'polls',
  votes: 'votes',
  announcements: 'announcements',
  notifications: 'notifications',
  notificationItems: 'items',
  marketQuotes: 'market_quotes',
  appSettings: 'app_settings',
  reports: 'reports',
} as const;

/** The app ships a single community room; the id is fixed and well-known. */
export const MAIN_COMMUNITY_ID = 'main';

export const refs = {
  users: () => collection(db(), COLLECTIONS.users),
  user: (uid: string) => doc(db(), COLLECTIONS.users, uid),
  userPrivate: (uid: string) => doc(db(), COLLECTIONS.users, uid, 'private', 'contact'),
  username: (usernameLower: string) => doc(db(), COLLECTIONS.usernames, usernameLower),

  subscription: (uid: string) => doc(db(), COLLECTIONS.subscriptions, uid),

  signals: () => collection(db(), COLLECTIONS.signals),
  signal: (id: string) => doc(db(), COLLECTIONS.signals, id),

  dailyStats: () => collection(db(), COLLECTIONS.dailyStats),
  dailyStat: (day: string) => doc(db(), COLLECTIONS.dailyStats, day),
  dailyBrief: (day: string) => doc(db(), COLLECTIONS.dailyBriefs, day),
  dailyBriefs: () => collection(db(), COLLECTIONS.dailyBriefs),

  news: () => collection(db(), COLLECTIONS.news),
  newsArticle: (id: string) => doc(db(), COLLECTIONS.news, id),

  courses: () => collection(db(), COLLECTIONS.courses),
  course: (id: string) => doc(db(), COLLECTIONS.courses, id),
  lessons: (courseId: string) =>
    collection(db(), COLLECTIONS.courses, courseId, COLLECTIONS.lessons),
  lesson: (courseId: string, lessonId: string) =>
    doc(db(), COLLECTIONS.courses, courseId, COLLECTIONS.lessons, lessonId),
  allLessons: () => collectionGroup(db(), COLLECTIONS.lessons),

  progress: (uid: string) =>
    collection(db(), COLLECTIONS.userProgress, uid, COLLECTIONS.lessons),
  progressItem: (uid: string, lessonId: string) =>
    doc(db(), COLLECTIONS.userProgress, uid, COLLECTIONS.lessons, lessonId),

  community: (id: string = MAIN_COMMUNITY_ID) => doc(db(), COLLECTIONS.community, id),
  messages: (communityId: string = MAIN_COMMUNITY_ID) =>
    collection(db(), COLLECTIONS.community, communityId, COLLECTIONS.messages),
  message: (id: string, communityId: string = MAIN_COMMUNITY_ID) =>
    doc(db(), COLLECTIONS.community, communityId, COLLECTIONS.messages, id),
  typing: (uid: string, communityId: string = MAIN_COMMUNITY_ID) =>
    doc(db(), COLLECTIONS.community, communityId, 'typing', uid),

  members: () => collection(db(), COLLECTIONS.communityMembers),
  member: (uid: string) => doc(db(), COLLECTIONS.communityMembers, uid),

  joinRequests: () => collection(db(), COLLECTIONS.joinRequests),
  joinRequest: (uid: string) => doc(db(), COLLECTIONS.joinRequests, uid),

  polls: () => collection(db(), COLLECTIONS.polls),
  poll: (id: string) => doc(db(), COLLECTIONS.polls, id),
  pollVote: (pollId: string, uid: string) =>
    doc(db(), COLLECTIONS.polls, pollId, COLLECTIONS.votes, uid),

  announcements: () => collection(db(), COLLECTIONS.announcements),

  notifications: (uid: string) =>
    collection(db(), COLLECTIONS.notifications, uid, COLLECTIONS.notificationItems),
  notification: (uid: string, id: string) =>
    doc(db(), COLLECTIONS.notifications, uid, COLLECTIONS.notificationItems, id),

  marketQuotes: () => collection(db(), COLLECTIONS.marketQuotes),

  appSettings: () => doc(db(), COLLECTIONS.appSettings, 'config'),

  reports: () => collection(db(), COLLECTIONS.reports),
};

/** Storage object paths. Mirrors storage.rules exactly. */
export const storagePaths = {
  avatar: (uid: string, ext: string) => `avatars/${uid}/profile.${ext}`,
  communityImage: (uid: string, id: string, ext: string) => `community/${uid}/images/${id}.${ext}`,
  communityVideo: (uid: string, id: string, ext: string) => `community/${uid}/videos/${id}.${ext}`,
  communityAudio: (uid: string, id: string, ext: string) => `community/${uid}/audio/${id}.${ext}`,
  communityFile: (uid: string, id: string, name: string) => `community/${uid}/files/${id}-${name}`,
};
