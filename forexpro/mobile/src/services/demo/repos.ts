import type {
  Announcement,
  AppNotification,
  AppSettings,
  AppUser,
  CommunityInfo,
  CommunityMember,
  Course,
  DailyBrief,
  DailyStats,
  JoinRequest,
  Lesson,
  LessonProgress,
  MarketQuote,
  Message,
  MessageMedia,
  MessageType,
  NewsArticle,
  NewsCategory,
  PlanId,
  Poll,
  ReplyPreview,
  Signal,
  SignalTeaser,
  Subscription,
  ThemePreference,
  NotificationPrefs,
  UserAddress,
} from '../../types/models';
import { demoDb, lessonsFor, nextMessageId, DEMO_UID } from './db';

/**
 * Demo implementations of every repository function.
 *
 * Signatures match the Firebase repositories exactly, so the delegation in each
 * real repository is a single early return and no caller — hook, screen or
 * component — knows which mode it is running in.
 *
 * Mutations write back into the observable store, so the demo build behaves
 * like the live app: send a message and it appears, vote and the tally moves,
 * complete a lesson and progress advances.
 */

const noop = () => undefined;

// -------------------------------------------------------------------- signals

function visibleSignals(canReadPremium: boolean): Signal[] {
  return demoDb.signals
    .get()
    .filter((s) => s.status === 'published' && (canReadPremium || !s.isPremium))
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

export function observeSignals(
  opts: { canReadPremium: boolean; historyLimit: number },
  onData: (signals: Signal[]) => void,
) {
  return demoDb.signals.subscribe(() => {
    onData(visibleSignals(opts.canReadPremium).slice(0, opts.historyLimit));
  });
}

export function observeSignal(id: string, onData: (signal: Signal | null) => void) {
  return demoDb.signals.subscribe((signals) => {
    onData(signals.find((s) => s.id === id) ?? null);
  });
}

export function observeLatestSignal(
  canReadPremium: boolean,
  onData: (signal: Signal | null) => void,
) {
  return demoDb.signals.subscribe(() => {
    onData(visibleSignals(canReadPremium)[0] ?? null);
  });
}

export function observePremiumTeasers(onData: (teasers: SignalTeaser[]) => void) {
  return demoDb.teasers.subscribe(onData);
}

export function observeTodayStats(onData: (stats: DailyStats | null) => void) {
  return demoDb.stats.subscribe(onData);
}

export function observeDailyBrief(onData: (brief: DailyBrief | null) => void) {
  return demoDb.brief.subscribe(onData);
}

export async function fetchSignalPage(canReadPremium: boolean) {
  // The demo dataset is small enough that the live listener already delivers
  // everything; there is no second page to fetch.
  return { signals: visibleSignals(canReadPremium), cursor: null, hasMore: false };
}

export async function countSignalsToday(canReadPremium: boolean): Promise<number> {
  const start = new Date().setHours(0, 0, 0, 0);
  return visibleSignals(canReadPremium).filter((s) => s.publishedAt >= start).length;
}

// ----------------------------------------------------------------------- news

function visibleNews(canReadPremium: boolean, category: NewsCategory | 'all'): NewsArticle[] {
  return demoDb.news
    .get()
    .filter(
      (n) =>
        n.status === 'published' &&
        (canReadPremium || !n.isPremium) &&
        (category === 'all' || n.category === category),
    )
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

export function observeLatestNews(
  canReadPremium: boolean,
  count: number,
  onData: (news: NewsArticle[]) => void,
) {
  return demoDb.news.subscribe(() => onData(visibleNews(canReadPremium, 'all').slice(0, count)));
}

export async function fetchNewsPage(category: NewsCategory | 'all', canReadPremium: boolean) {
  return { items: visibleNews(canReadPremium, category), cursor: null, hasMore: false };
}

export async function fetchNewsArticle(id: string): Promise<NewsArticle | null> {
  const article = demoDb.news.get().find((n) => n.id === id) ?? null;
  // Reproduce the real permission failure so the paywall path is testable.
  if (article?.isPremium && demoDb.user.get().plan !== 'premium') {
    throw { code: 'permission-denied' };
  }
  return article;
}

// ----------------------------------------------------------------- education

export function observeCourses(onData: (courses: Course[]) => void) {
  return demoDb.courses.subscribe((courses) =>
    onData([...courses].sort((a, b) => a.order - b.order)),
  );
}

export async function fetchCourse(id: string): Promise<Course | null> {
  return demoDb.courses.get().find((c) => c.id === id) ?? null;
}

export async function fetchLessons(courseId: string): Promise<Lesson[]> {
  return [...lessonsFor(courseId)].sort((a, b) => a.order - b.order);
}

export async function fetchLesson(courseId: string, lessonId: string): Promise<Lesson | null> {
  const lesson = lessonsFor(courseId).find((l) => l.id === lessonId) ?? null;
  if (lesson?.isPremium && demoDb.user.get().plan !== 'premium') {
    throw { code: 'permission-denied' };
  }
  return lesson;
}

export function observeProgress(
  _uid: string,
  onData: (progress: Record<string, LessonProgress>) => void,
) {
  return demoDb.progress.subscribe(onData);
}

export async function markLessonComplete(
  _uid: string,
  courseId: string,
  lessonId: string,
  score?: number,
): Promise<void> {
  demoDb.progress.update((current) => ({
    ...current,
    [lessonId]: { lessonId, courseId, completed: true, completedAt: Date.now(), score },
  }));
  demoDb.user.update((user) => ({
    ...user,
    stats: {
      lessonsCompleted: (user.stats?.lessonsCompleted ?? 0) + 1,
      messagesSent: user.stats?.messagesSent ?? 0,
    },
  }));
}

// ------------------------------------------------------------------ profile

export function observeUser(_uid: string, onData: (user: AppUser | null) => void) {
  return demoDb.user.subscribe(onData);
}

export async function fetchUser(): Promise<AppUser | null> {
  return demoDb.user.get();
}

export async function updateProfileFields(
  _uid: string,
  update: { fullName?: string; bio?: string; photoURL?: string; address?: UserAddress },
): Promise<void> {
  demoDb.user.update((user) => ({ ...user, ...update, updatedAt: Date.now() }));
}

export async function updatePhone(_uid: string, phone: string): Promise<void> {
  demoDb.user.update((user) => ({ ...user, phone }));
}

export async function fetchPhone(): Promise<string> {
  return demoDb.user.get().phone ?? '';
}

export async function updateNotificationPrefs(
  _uid: string,
  prefs: NotificationPrefs,
): Promise<void> {
  demoDb.user.update((user) => ({ ...user, notificationPrefs: prefs }));
}

export async function updateThemePreference(
  _uid: string,
  themePreference: ThemePreference,
): Promise<void> {
  demoDb.user.update((user) => ({ ...user, themePreference }));
}

export async function markOnboardingComplete(): Promise<void> {
  demoDb.user.update((user) => ({ ...user, onboardingCompleted: true }));
}

export async function touchLogin(): Promise<void> {
  demoDb.user.update((user) => ({ ...user, lastLoginAt: Date.now() }));
}

export function observeSubscription(_uid: string, onData: (sub: Subscription | null) => void) {
  return demoDb.subscription.subscribe(onData);
}

export async function fetchCourseProgress(
  _uid: string,
  courseId: string,
): Promise<LessonProgress[]> {
  return Object.values(demoDb.progress.get()).filter((p) => p.courseId === courseId);
}

// ---------------------------------------------------------------- community

export function observeCommunity(onData: (info: CommunityInfo | null) => void) {
  return demoDb.community.subscribe(onData);
}

export function observeRecentMessages(
  onData: (messages: Message[], cursor: null) => void,
) {
  return demoDb.messages.subscribe((messages) => onData(messages, null));
}

export async function fetchOlderMessages() {
  return { messages: [] as Message[], cursor: null, hasMore: false };
}

export type DemoSendInput = {
  author: AppUser;
  type: MessageType;
  text?: string;
  media?: MessageMedia;
  replyTo?: ReplyPreview;
  mentions?: string[];
  forwarded?: boolean;
};

export async function sendMessage(input: DemoSendInput): Promise<string> {
  const id = nextMessageId();
  const message: Message = {
    id,
    authorId: input.author.uid,
    authorName: input.author.fullName,
    authorPhoto: input.author.photoURL,
    authorRole: input.author.role,
    authorPlan: input.author.plan,
    type: input.type,
    text: input.text,
    media: input.media,
    replyTo: input.replyTo,
    mentions: input.mentions,
    forwarded: input.forwarded,
    reactions: {},
    pinned: false,
    deleted: false,
    createdAt: Date.now(),
  };
  demoDb.messages.update((messages) => [message, ...messages]);
  return id;
}

export async function editMessage(id: string, text: string): Promise<void> {
  demoDb.messages.update((messages) =>
    messages.map((m) => (m.id === id ? { ...m, text, editedAt: Date.now() } : m)),
  );
}

export async function deleteMessage(id: string, byUid: string): Promise<void> {
  demoDb.messages.update((messages) =>
    messages.map((m) =>
      m.id === id ? { ...m, deleted: true, deletedBy: byUid, text: '', media: undefined } : m,
    ),
  );
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
  uid: string,
  add: boolean,
): Promise<void> {
  demoDb.messages.update((messages) =>
    messages.map((m) => {
      if (m.id !== messageId) return m;
      const current = m.reactions[emoji] ?? [];
      const next = add ? [...current, uid] : current.filter((u) => u !== uid);
      const reactions = { ...m.reactions };
      if (next.length > 0) reactions[emoji] = next;
      else delete reactions[emoji];
      return { ...m, reactions };
    }),
  );
}

export async function setPinned(messageId: string, pinned: boolean): Promise<void> {
  demoDb.messages.update((messages) =>
    messages.map((m) => (m.id === messageId ? { ...m, pinned } : { ...m, pinned: false })),
  );
  demoDb.community.update((info) => ({ ...info, pinnedMessageId: pinned ? messageId : undefined }));
}

export async function fetchMessage(id: string): Promise<Message | null> {
  return demoDb.messages.get().find((m) => m.id === id) ?? null;
}

export function observeMembers(onData: (members: CommunityMember[]) => void) {
  return demoDb.members.subscribe(onData);
}

export async function stampLastRead(): Promise<void> {
  // Nothing to persist in demo mode.
}

export async function setTyping(): Promise<void> {
  // Presence is not simulated.
}

export function observeMyJoinRequest(_uid: string, onData: (req: JoinRequest | null) => void) {
  return demoDb.joinRequest.subscribe(onData);
}

// -------------------------------------------------------------------- polls

export function observeActivePoll(onData: (poll: Poll | null) => void) {
  return demoDb.poll.subscribe(onData);
}

export function observePolls(count: number, onData: (polls: Poll[]) => void) {
  return demoDb.poll.subscribe((poll) => onData([poll].slice(0, count)));
}

export function observeMyVote(
  _pollId: string,
  _uid: string,
  onData: (optionIds: string[] | null) => void,
) {
  return demoDb.myVote.subscribe(onData);
}

export async function fetchMyVote(): Promise<string[] | null> {
  return demoDb.myVote.get();
}

export async function castVote(optionIds: string[]): Promise<void> {
  if (demoDb.myVote.get() !== null) throw { code: 'already-exists' };
  demoDb.myVote.set(optionIds);
  demoDb.poll.update((poll) => ({
    ...poll,
    options: poll.options.map((o) =>
      optionIds.includes(o.id) ? { ...o, votes: o.votes + 1 } : o,
    ),
    totalVotes: poll.totalVotes + 1,
  }));
}

// ------------------------------------------------------------ notifications

export function observeNotifications(
  _uid: string,
  count: number,
  onData: (items: AppNotification[]) => void,
) {
  return demoDb.notifications.subscribe((items) => onData(items.slice(0, count)));
}

export function observeUnreadCount(_uid: string, onData: (count: number) => void) {
  return demoDb.notifications.subscribe((items) =>
    onData(items.filter((i) => !i.read).length),
  );
}

export async function markRead(_uid: string, id: string): Promise<void> {
  demoDb.notifications.update((items) =>
    items.map((i) => (i.id === id ? { ...i, read: true } : i)),
  );
}

export async function markAllRead(): Promise<void> {
  demoDb.notifications.update((items) => items.map((i) => ({ ...i, read: true })));
}

export async function deleteNotification(_uid: string, id: string): Promise<void> {
  demoDb.notifications.update((items) => items.filter((i) => i.id !== id));
}

export function observeAnnouncements(
  plan: PlanId,
  count: number,
  onData: (items: Announcement[]) => void,
) {
  return demoDb.announcements.subscribe((items) =>
    onData(items.filter((a) => a.audience === 'all' || a.audience === plan).slice(0, count)),
  );
}

// ------------------------------------------------------------------ settings

export function observeAppSettings(onData: (settings: AppSettings) => void) {
  return demoDb.settings.subscribe(onData);
}

export async function fetchAppSettings(): Promise<AppSettings> {
  return demoDb.settings.get();
}

export function observeMarketQuotes(onData: (quotes: MarketQuote[], isDemo: boolean) => void) {
  return demoDb.quotes.subscribe((quotes) => onData(quotes, true));
}

export { noop, DEMO_UID };
