import { Timestamp, type DocumentSnapshot, type DocumentData } from '@react-native-firebase/firestore';
import {
  AppUser,
  Announcement,
  AppNotification,
  AppSettings,
  Course,
  CommunityInfo,
  CommunityMember,
  DailyBrief,
  DailyStats,
  JoinRequest,
  Lesson,
  LessonProgress,
  MarketQuote,
  Message,
  Millis,
  NewsArticle,
  Poll,
  Signal,
  Subscription,
  defaultNotificationPrefs,
  fallbackAppSettings,
} from '../../types/models';
import { digitsFor } from '../../utils/format';

/**
 * Firestore -> domain mapping.
 *
 * Every mapper is defensive: a missing or malformed field yields a sane default
 * instead of throwing, because one bad document must never blank an entire
 * screen. Timestamps become epoch millis here and nowhere else.
 */

/** Normalises Timestamp | number | Date | null into epoch millis. */
export function ms(value: unknown, fallback = 0): Millis {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  // A serverTimestamp() write is null in the local (pending) snapshot — treat
  // it as "now" so optimistic UI sorts correctly.
  return fallback;
}

function msOrNow(value: unknown): Millis {
  return ms(value, Date.now());
}

function msOrUndefined(value: unknown): Millis | undefined {
  const v = ms(value, 0);
  return v === 0 ? undefined : v;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function arr<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function obj(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

type Snap = DocumentSnapshot<DocumentData>;

// ---------------------------------------------------------------------- user

export function mapUser(snap: Snap): AppUser | null {
  const d = snap.data();
  if (!d) return null;
  const community = obj(d.community);
  const prefs = obj(d.notificationPrefs);

  return {
    uid: snap.id,
    fullName: str(d.fullName, 'Trader'),
    username: str(d.username),
    email: str(d.email),
    phone: str(d.phone) || undefined,
    photoURL: str(d.photoURL) || undefined,
    bio: str(d.bio) || undefined,
    address: d.address ? (obj(d.address) as AppUser['address']) : undefined,

    role: oneOf(d.role, ['user', 'moderator', 'admin'] as const, 'user'),
    plan: oneOf(d.plan, ['free', 'premium'] as const, 'free'),
    planExpiresAt: msOrUndefined(d.planExpiresAt),
    planSource: d.planSource
      ? oneOf(d.planSource, ['apple', 'google', 'manual'] as const, 'manual')
      : undefined,
    status: oneOf(d.status, ['active', 'suspended', 'banned'] as const, 'active'),

    community: {
      status: oneOf(
        community.status,
        ['none', 'pending', 'approved', 'rejected', 'blocked'] as const,
        'none',
      ),
      joinedAt: msOrUndefined(community.joinedAt),
      mutedUntil: msOrUndefined(community.mutedUntil),
    },

    notificationPrefs: { ...defaultNotificationPrefs, ...(prefs as object) },
    themePreference: oneOf(d.themePreference, ['dark', 'light', 'system'] as const, 'dark'),
    onboardingCompleted: bool(d.onboardingCompleted),

    createdAt: msOrNow(d.createdAt),
    updatedAt: msOrUndefined(d.updatedAt),
    lastLoginAt: msOrUndefined(d.lastLoginAt),
    platform: d.platform === 'ios' || d.platform === 'android' ? d.platform : undefined,
    appVersion: str(d.appVersion) || undefined,
    stats: {
      lessonsCompleted: num(obj(d.stats).lessonsCompleted),
      messagesSent: num(obj(d.stats).messagesSent),
    },
  };
}

// -------------------------------------------------------------- subscription

export function mapSubscription(snap: Snap): Subscription | null {
  const d = snap.data();
  if (!d) return null;
  return {
    uid: snap.id,
    plan: oneOf(d.plan, ['free', 'premium'] as const, 'free'),
    status: oneOf(
      d.status,
      ['active', 'in_grace', 'on_hold', 'cancelled', 'expired', 'refunded'] as const,
      'expired',
    ),
    productId: str(d.productId) || undefined,
    store: d.store ? oneOf(d.store, ['apple', 'google', 'manual'] as const, 'manual') : undefined,
    startedAt: msOrUndefined(d.startedAt),
    expiresAt: msOrUndefined(d.expiresAt),
    autoRenewing: bool(d.autoRenewing, false),
    isTrial: bool(d.isTrial, false),
    lastVerifiedAt: msOrUndefined(d.lastVerifiedAt),
    environment: d.environment === 'sandbox' ? 'sandbox' : 'production',
  };
}

// -------------------------------------------------------------------- signal

export function mapSignal(snap: Snap): Signal | null {
  const d = snap.data();
  if (!d) return null;

  const takeProfits = arr<Record<string, unknown>>(d.takeProfits)
    .map((tp, i) => ({
      level: (num(tp.level, i + 1) as 1 | 2 | 3) ?? 1,
      price: num(tp.price),
      hit: bool(tp.hit),
      hitAt: msOrUndefined(tp.hitAt),
    }))
    .filter((tp) => tp.price > 0);

  return {
    id: snap.id,
    pair: str(d.pair, '—').toUpperCase(),
    direction: oneOf(d.direction, ['buy', 'sell'] as const, 'buy'),
    entry: num(d.entry),
    stopLoss: num(d.stopLoss),
    takeProfits,
    riskReward: typeof d.riskReward === 'number' ? d.riskReward : undefined,
    timeframe: str(d.timeframe, 'H1'),
    strategy: str(d.strategy) || undefined,
    confidence: oneOf(d.confidence, ['low', 'medium', 'high'] as const, 'medium'),
    chartUrl: str(d.chartUrl) || undefined,
    analysis: {
      technical: str(obj(d.analysis).technical) || undefined,
      fundamental: str(obj(d.analysis).fundamental) || undefined,
    },
    status: oneOf(d.status, ['draft', 'published', 'cancelled'] as const, 'published'),
    tradeState: oneOf(
      d.tradeState,
      ['pending', 'active', 'tp_hit', 'sl_hit', 'closed', 'cancelled'] as const,
      'pending',
    ),
    result: d.result ? oneOf(d.result, ['win', 'loss', 'breakeven'] as const, 'breakeven') : undefined,
    pips: typeof d.pips === 'number' ? d.pips : undefined,
    isPremium: bool(d.isPremium),
    timeline: arr<Record<string, unknown>>(d.timeline).map((t) => ({
      state: str(t.state, 'published') as Signal['timeline'][number]['state'],
      at: msOrNow(t.at),
      note: str(t.note) || undefined,
    })),
    authorId: str(d.authorId),
    authorName: str(d.authorName, 'Analyst'),
    tags: arr<string>(d.tags),
    publishedAt: msOrNow(d.publishedAt ?? d.createdAt),
    createdAt: msOrNow(d.createdAt),
    updatedAt: msOrUndefined(d.updatedAt),
    closedAt: msOrUndefined(d.closedAt),
  };
}

/**
 * A free user's view of a premium signal: direction and pair stay visible so
 * the value is obvious, but every actionable level is stripped. The security
 * rules already prevent the document from being read at all — this exists for
 * the locked *preview* cards, which are built from metadata only.
 */
export function redactSignal(signal: Signal): Signal {
  return {
    ...signal,
    entry: 0,
    stopLoss: 0,
    takeProfits: [],
    analysis: undefined,
    chartUrl: undefined,
  };
}

export function mapDailyStats(snap: Snap): DailyStats | null {
  const d = snap.data();
  if (!d) return null;
  return {
    day: snap.id,
    signals: num(d.signals),
    wins: num(d.wins),
    losses: num(d.losses),
    breakeven: num(d.breakeven),
    winRate: num(d.winRate),
    avgRR: num(d.avgRR),
    totalPips: num(d.totalPips),
  };
}

export function mapDailyBrief(snap: Snap): DailyBrief | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id,
    mood: oneOf(d.mood, ['risk_on', 'risk_off', 'mixed'] as const, 'mixed'),
    headline: str(d.headline),
    summary: str(d.summary),
    majorPairs: arr<DailyBrief['majorPairs'][number]>(d.majorPairs),
    events: arr<DailyBrief['events'][number]>(d.events),
    keyLevels: arr<DailyBrief['keyLevels'][number]>(d.keyLevels),
    focus: str(d.focus),
    isPremium: bool(d.isPremium),
    publishedAt: msOrNow(d.publishedAt),
  };
}

// ---------------------------------------------------------------------- news

export function mapNews(snap: Snap): NewsArticle | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id,
    title: str(d.title),
    summary: str(d.summary),
    body: str(d.body),
    category: oneOf(
      d.category,
      ['forex', 'economy', 'central_banks', 'interest_rates', 'gold', 'usd', 'global_markets'] as const,
      'forex',
    ),
    imageUrl: str(d.imageUrl) || undefined,
    source: str(d.source) || undefined,
    sourceUrl: str(d.sourceUrl) || undefined,
    isPremium: bool(d.isPremium),
    status: oneOf(d.status, ['draft', 'published'] as const, 'published'),
    authorId: str(d.authorId) || undefined,
    publishedAt: msOrNow(d.publishedAt ?? d.createdAt),
    createdAt: msOrNow(d.createdAt),
  };
}

// ----------------------------------------------------------------- education

export function mapCourse(snap: Snap): Course | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id,
    title: str(d.title),
    description: str(d.description),
    category: oneOf(
      d.category,
      [
        'forex_basics',
        'technical_analysis',
        'fundamental_analysis',
        'smc',
        'ict',
        'risk_management',
        'trading_psychology',
        'advanced',
      ] as const,
      'forex_basics',
    ),
    level: oneOf(d.level, ['beginner', 'intermediate', 'advanced'] as const, 'beginner'),
    coverUrl: str(d.coverUrl) || undefined,
    isPremium: bool(d.isPremium),
    lessonCount: num(d.lessonCount),
    estimatedMinutes: num(d.estimatedMinutes),
    order: num(d.order, 999),
    status: oneOf(d.status, ['draft', 'published'] as const, 'published'),
    createdAt: msOrNow(d.createdAt),
  };
}

export function mapLesson(snap: Snap, courseId: string): Lesson | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id,
    courseId: str(d.courseId, courseId),
    title: str(d.title),
    type: oneOf(d.type, ['text', 'video', 'pdf', 'quiz'] as const, 'text'),
    summary: str(d.summary) || undefined,
    content: str(d.content) || undefined,
    videoUrl: str(d.videoUrl) || undefined,
    pdfUrl: str(d.pdfUrl) || undefined,
    imageUrls: arr<string>(d.imageUrls),
    quiz: arr<Lesson['quiz']>(d.quiz).length ? (d.quiz as Lesson['quiz']) : undefined,
    durationMinutes: num(d.durationMinutes, 5),
    order: num(d.order, 999),
    isPremium: bool(d.isPremium),
  };
}

export function mapProgress(snap: Snap): LessonProgress | null {
  const d = snap.data();
  if (!d) return null;
  return {
    lessonId: snap.id,
    courseId: str(d.courseId),
    completed: bool(d.completed),
    completedAt: msOrUndefined(d.completedAt),
    score: typeof d.score === 'number' ? d.score : undefined,
  };
}

// ----------------------------------------------------------------- community

export function mapCommunity(snap: Snap): CommunityInfo | null {
  const d = snap.data();
  if (!d) return null;
  const topic = obj(d.dailyTopic);
  return {
    id: snap.id,
    name: str(d.name, 'Trading Floor'),
    description: str(d.description),
    memberCount: num(d.memberCount),
    onlineCount: num(d.onlineCount),
    pinnedMessageId: str(d.pinnedMessageId) || undefined,
    dailyTopic: topic.title
      ? { title: str(topic.title), body: str(topic.body), postedAt: msOrNow(topic.postedAt) }
      : undefined,
    rules: arr<string>(d.rules),
    updatedAt: msOrUndefined(d.updatedAt),
  };
}

export function mapMessage(snap: Snap): Message | null {
  const d = snap.data();
  if (!d) return null;

  // reactions is stored as { emoji: uid[] }
  const rawReactions = obj(d.reactions);
  const reactions: Record<string, string[]> = {};
  for (const [emoji, uids] of Object.entries(rawReactions)) {
    if (Array.isArray(uids) && uids.length > 0) reactions[emoji] = uids as string[];
  }

  const media = obj(d.media);

  return {
    id: snap.id,
    authorId: str(d.authorId),
    authorName: str(d.authorName, 'Member'),
    authorPhoto: str(d.authorPhoto) || undefined,
    authorRole: oneOf(d.authorRole, ['user', 'moderator', 'admin'] as const, 'user'),
    authorPlan: oneOf(d.authorPlan, ['free', 'premium'] as const, 'free'),
    type: oneOf(d.type, ['text', 'image', 'video', 'audio', 'file', 'system'] as const, 'text'),
    text: str(d.text) || undefined,
    media: media.url
      ? {
          url: str(media.url),
          width: num(media.width) || undefined,
          height: num(media.height) || undefined,
          durationMs: num(media.durationMs) || undefined,
          sizeBytes: num(media.sizeBytes) || undefined,
          name: str(media.name) || undefined,
          mimeType: str(media.mimeType) || undefined,
          waveform: arr<number>(media.waveform),
        }
      : undefined,
    replyTo: obj(d.replyTo).id
      ? {
          id: str(obj(d.replyTo).id),
          authorName: str(obj(d.replyTo).authorName),
          preview: str(obj(d.replyTo).preview),
        }
      : undefined,
    reactions,
    mentions: arr<string>(d.mentions),
    pinned: bool(d.pinned),
    deleted: bool(d.deleted),
    deletedBy: str(d.deletedBy) || undefined,
    forwarded: bool(d.forwarded),
    // A message written with serverTimestamp() reads back null until the write
    // lands; "now" keeps it at the bottom of the list where the user expects.
    createdAt: msOrNow(d.createdAt),
    editedAt: msOrUndefined(d.editedAt),
  };
}

export function mapMember(snap: Snap): CommunityMember | null {
  const d = snap.data();
  if (!d) return null;
  return {
    uid: snap.id,
    displayName: str(d.displayName, 'Member'),
    username: str(d.username) || undefined,
    photoURL: str(d.photoURL) || undefined,
    role: oneOf(d.role, ['user', 'moderator', 'admin'] as const, 'user'),
    plan: oneOf(d.plan, ['free', 'premium'] as const, 'free'),
    status: oneOf(
      d.status,
      ['none', 'pending', 'approved', 'rejected', 'blocked'] as const,
      'approved',
    ),
    mutedUntil: msOrUndefined(d.mutedUntil),
    joinedAt: msOrNow(d.joinedAt),
    lastSeenAt: msOrUndefined(d.lastSeenAt),
  };
}

export function mapJoinRequest(snap: Snap): JoinRequest | null {
  const d = snap.data();
  if (!d) return null;
  return {
    uid: snap.id,
    fullName: str(d.fullName),
    username: str(d.username),
    email: str(d.email),
    photoURL: str(d.photoURL) || undefined,
    message: str(d.message) || undefined,
    status: oneOf(d.status, ['pending', 'approved', 'rejected', 'blocked'] as const, 'pending'),
    createdAt: msOrNow(d.createdAt),
    decidedAt: msOrUndefined(d.decidedAt),
    decidedBy: str(d.decidedBy) || undefined,
  };
}

// --------------------------------------------------------------------- polls

export function mapPoll(snap: Snap): Poll | null {
  const d = snap.data();
  if (!d) return null;
  const options = arr<Record<string, unknown>>(d.options).map((o, i) => ({
    id: str(o.id, `opt${i}`),
    label: str(o.label),
    votes: num(o.votes),
  }));
  return {
    id: snap.id,
    question: str(d.question),
    description: str(d.description) || undefined,
    type: oneOf(d.type, ['daily', 'weekly', 'trading', 'multi'] as const, 'trading'),
    options,
    totalVotes: num(d.totalVotes, options.reduce((sum, o) => sum + o.votes, 0)),
    allowMultiple: bool(d.allowMultiple),
    isActive: bool(d.isActive, true),
    expiresAt: msOrUndefined(d.expiresAt),
    createdAt: msOrNow(d.createdAt),
    createdBy: str(d.createdBy),
  };
}

// ------------------------------------------------------- announcements/notifs

export function mapAnnouncement(snap: Snap): Announcement | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id,
    title: str(d.title),
    body: str(d.body),
    level: oneOf(d.level, ['info', 'important', 'critical'] as const, 'info'),
    audience: oneOf(d.audience, ['all', 'free', 'premium'] as const, 'all'),
    pinned: bool(d.pinned),
    createdAt: msOrNow(d.createdAt),
    createdBy: str(d.createdBy),
  };
}

export function mapNotification(snap: Snap): AppNotification | null {
  const d = snap.data();
  if (!d) return null;
  return {
    id: snap.id,
    type: oneOf(
      d.type,
      [
        'new_signal',
        'premium_signal',
        'signal_update',
        'news',
        'lesson',
        'poll',
        'community',
        'announcement',
        'subscription',
        'join_request',
      ] as const,
      'announcement',
    ),
    title: str(d.title),
    body: str(d.body),
    imageUrl: str(d.imageUrl) || undefined,
    route: str(d.route) || undefined,
    data: obj(d.data) as Record<string, string>,
    read: bool(d.read),
    createdAt: msOrNow(d.createdAt),
  };
}

// ------------------------------------------------------------- market quotes

export function mapQuote(snap: Snap): MarketQuote | null {
  const d = snap.data();
  if (!d) return null;
  const symbol = str(d.symbol, snap.id);
  return {
    symbol,
    displayName: str(d.displayName, symbol),
    price: num(d.price),
    change: num(d.change),
    changePct: num(d.changePct),
    high: typeof d.high === 'number' ? d.high : undefined,
    low: typeof d.low === 'number' ? d.low : undefined,
    sparkline: arr<number>(d.sparkline),
    digits: num(d.digits, digitsFor(symbol)),
    updatedAt: msOrNow(d.updatedAt),
  };
}

// ------------------------------------------------------------- app settings

export function mapAppSettings(snap: Snap): AppSettings {
  const d = snap.data();
  if (!d) return fallbackAppSettings;
  const f = fallbackAppSettings;
  return {
    signalLimits: { ...f.signalLimits, ...(obj(d.signalLimits) as object) },
    features: { ...f.features, ...(obj(d.features) as object) },
    products: { ...f.products, ...(obj(d.products) as object) },
    legal: { ...f.legal, ...(obj(d.legal) as object) },
    maintenance: { ...f.maintenance, ...(obj(d.maintenance) as object) },
    minSupportedVersion: str(d.minSupportedVersion) || undefined,
  };
}
