/**
 * Domain model.
 *
 * These are plain, serialisable shapes — no Firestore types leak past the
 * repository layer. Every timestamp is epoch milliseconds (`number`), converted
 * once in `services/firebase/mappers.ts`. That keeps components, stores and
 * tests free of SDK objects and makes the whole model trivially mockable.
 *
 * The canonical description of these collections lives in docs/DATA_MODEL.md;
 * the admin dashboard and Cloud Functions mirror these shapes.
 */

// ---------------------------------------------------------------- primitives

export type Millis = number;

export type UserRole = 'user' | 'moderator' | 'admin';
export type PlanId = 'free' | 'premium';
export type AccountStatus = 'active' | 'suspended' | 'banned';
export type CommunityStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'blocked';
export type ThemePreference = 'dark' | 'light' | 'system';

// --------------------------------------------------------------------- user

export type NotificationPrefs = {
  newSignal: boolean;
  premiumSignal: boolean;
  signalUpdate: boolean;
  news: boolean;
  lessons: boolean;
  polls: boolean;
  community: boolean;
  announcements: boolean;
  subscription: boolean;
};

export const defaultNotificationPrefs: NotificationPrefs = {
  newSignal: true,
  premiumSignal: true,
  signalUpdate: true,
  news: true,
  lessons: true,
  polls: true,
  community: true,
  announcements: true,
  subscription: true,
};

export type UserAddress = {
  line1?: string;
  city?: string;
  country?: string;
};

export type AppUser = {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  photoURL?: string;
  bio?: string;
  address?: UserAddress;

  role: UserRole;
  plan: PlanId;
  planExpiresAt?: Millis;
  planSource?: 'apple' | 'google' | 'manual';
  status: AccountStatus;

  community: {
    status: CommunityStatus;
    joinedAt?: Millis;
    mutedUntil?: Millis;
  };

  notificationPrefs: NotificationPrefs;
  themePreference: ThemePreference;
  onboardingCompleted: boolean;

  createdAt: Millis;
  updatedAt?: Millis;
  lastLoginAt?: Millis;
  platform?: 'ios' | 'android';
  appVersion?: string;

  stats?: {
    lessonsCompleted: number;
    messagesSent: number;
  };
};

/** Fraction 0..1 of the optional profile fields the user has filled in. */
export function profileCompletion(u: Pick<AppUser, 'fullName' | 'username' | 'email' | 'phone' | 'photoURL' | 'bio' | 'address'>): number {
  const checks = [
    !!u.fullName,
    !!u.username,
    !!u.email,
    !!u.phone,
    !!u.photoURL,
    !!u.bio,
    !!u.address?.country,
  ];
  return checks.filter(Boolean).length / checks.length;
}

// ------------------------------------------------------------- subscription

export type SubscriptionStatus =
  | 'active'
  | 'in_grace'
  | 'on_hold'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export type Store = 'apple' | 'google' | 'manual';

export type Subscription = {
  uid: string;
  plan: PlanId;
  status: SubscriptionStatus;
  productId?: string;
  store?: Store;
  startedAt?: Millis;
  expiresAt?: Millis;
  autoRenewing?: boolean;
  isTrial?: boolean;
  lastVerifiedAt?: Millis;
  environment?: 'sandbox' | 'production';
};

export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

export type PlanOffer = {
  id: BillingPeriod;
  productId: string;
  title: string;
  /** Localised price string from the store, e.g. "$29.99". */
  price: string;
  /** Raw price used only to compute the savings badge. */
  priceAmount: number;
  currency: string;
  periodLabel: string;
  perMonthLabel?: string;
  savingsPct?: number;
  highlighted?: boolean;
};

// ------------------------------------------------------------------ signals

export type SignalDirection = 'buy' | 'sell';

/** Lifecycle of the published item. */
export type SignalStatus = 'draft' | 'published' | 'cancelled';

/** Lifecycle of the trade itself. */
export type TradeState = 'pending' | 'active' | 'tp_hit' | 'sl_hit' | 'closed' | 'cancelled';

export type SignalResult = 'win' | 'loss' | 'breakeven';

export type Confidence = 'low' | 'medium' | 'high';

export type TakeProfit = {
  level: 1 | 2 | 3;
  price: number;
  hit: boolean;
  hitAt?: Millis;
};

export type SignalTimelineEntry = {
  state: TradeState | 'published' | 'entry_hit' | 'tp1_hit' | 'tp2_hit' | 'tp3_hit';
  at: Millis;
  note?: string;
};

export type Signal = {
  id: string;
  pair: string;
  direction: SignalDirection;
  entry: number;
  stopLoss: number;
  takeProfits: TakeProfit[];
  riskReward?: number;
  timeframe: string;
  strategy?: string;
  confidence: Confidence;
  chartUrl?: string;
  analysis?: {
    technical?: string;
    fundamental?: string;
  };
  status: SignalStatus;
  tradeState: TradeState;
  result?: SignalResult;
  pips?: number;
  isPremium: boolean;
  timeline: SignalTimelineEntry[];
  authorId: string;
  authorName: string;
  tags?: string[];
  publishedAt: Millis;
  createdAt: Millis;
  updatedAt?: Millis;
  closedAt?: Millis;
};

/**
 * Server-written projection of a premium signal, readable by everyone.
 *
 * It exists so a free account can be shown a real locked card ("EUR/USD BUY,
 * high confidence, H4") without the entry, stop or targets ever leaving the
 * server. Written by the onSignalPublished Cloud Function; no client can write
 * to the collection.
 */
export type SignalTeaser = {
  id: string;
  pair: string;
  direction: SignalDirection;
  timeframe: string;
  confidence: Confidence;
  publishedAt: Millis;
};

export type DailyStats = {
  day: string; // yyyy-MM-dd
  signals: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number; // 0..100
  avgRR: number;
  totalPips: number;
};

export type DailyBrief = {
  id: string; // yyyy-MM-dd
  mood: 'risk_on' | 'risk_off' | 'mixed';
  headline: string;
  summary: string;
  majorPairs: { pair: string; bias: 'bullish' | 'bearish' | 'neutral'; note?: string }[];
  events: { time: string; title: string; impact: 'low' | 'medium' | 'high' }[];
  keyLevels: { pair: string; support: string; resistance: string }[];
  focus: string;
  isPremium: boolean;
  publishedAt: Millis;
};

// --------------------------------------------------------------------- news

export type NewsCategory =
  | 'forex'
  | 'economy'
  | 'central_banks'
  | 'interest_rates'
  | 'gold'
  | 'usd'
  | 'global_markets';

export type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: NewsCategory;
  imageUrl?: string;
  source?: string;
  sourceUrl?: string;
  isPremium: boolean;
  status: 'draft' | 'published';
  authorId?: string;
  publishedAt: Millis;
  createdAt: Millis;
};

// ---------------------------------------------------------------- education

export type CourseCategory =
  | 'forex_basics'
  | 'technical_analysis'
  | 'fundamental_analysis'
  | 'smc'
  | 'ict'
  | 'risk_management'
  | 'trading_psychology'
  | 'advanced';

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export type Course = {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  level: CourseLevel;
  coverUrl?: string;
  isPremium: boolean;
  lessonCount: number;
  estimatedMinutes: number;
  order: number;
  status: 'draft' | 'published';
  createdAt: Millis;
};

export type LessonType = 'text' | 'video' | 'pdf' | 'quiz';

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type Lesson = {
  id: string;
  courseId: string;
  title: string;
  type: LessonType;
  summary?: string;
  content?: string;
  videoUrl?: string;
  pdfUrl?: string;
  imageUrls?: string[];
  quiz?: QuizQuestion[];
  durationMinutes: number;
  order: number;
  isPremium: boolean;
};

export type LessonProgress = {
  lessonId: string;
  courseId: string;
  completed: boolean;
  completedAt?: Millis;
  score?: number;
};

// --------------------------------------------------------------- community

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'system';

export type MessageMedia = {
  url: string;
  width?: number;
  height?: number;
  durationMs?: number;
  sizeBytes?: number;
  name?: string;
  mimeType?: string;
  /** Waveform buckets 0..1 for voice notes. */
  waveform?: number[];
};

export type ReplyPreview = {
  id: string;
  authorName: string;
  preview: string;
};

export type Message = {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorRole: UserRole;
  authorPlan: PlanId;
  type: MessageType;
  text?: string;
  media?: MessageMedia;
  replyTo?: ReplyPreview;
  /** emoji -> uids that reacted. */
  reactions: Record<string, string[]>;
  mentions?: string[];
  pinned: boolean;
  deleted: boolean;
  deletedBy?: string;
  forwarded?: boolean;
  createdAt: Millis;
  editedAt?: Millis;
  /** Client-only: set while the message is still being sent. */
  pending?: boolean;
  failed?: boolean;
};

export type CommunityInfo = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  onlineCount: number;
  pinnedMessageId?: string;
  dailyTopic?: {
    title: string;
    body: string;
    postedAt: Millis;
  };
  rules?: string[];
  updatedAt?: Millis;
};

export type CommunityMember = {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  role: UserRole;
  plan: PlanId;
  status: CommunityStatus;
  mutedUntil?: Millis;
  joinedAt: Millis;
  lastSeenAt?: Millis;
};

export type JoinRequest = {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  photoURL?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  createdAt: Millis;
  decidedAt?: Millis;
  decidedBy?: string;
};

// -------------------------------------------------------------------- polls

export type PollType = 'daily' | 'weekly' | 'trading' | 'multi';

export type PollOption = {
  id: string;
  label: string;
  votes: number;
};

export type Poll = {
  id: string;
  question: string;
  description?: string;
  type: PollType;
  options: PollOption[];
  totalVotes: number;
  allowMultiple: boolean;
  isActive: boolean;
  expiresAt?: Millis;
  createdAt: Millis;
  createdBy: string;
  /** Filled client-side from the caller's vote document. */
  myVote?: string[];
};

// ------------------------------------------------------------ announcements

export type Announcement = {
  id: string;
  title: string;
  body: string;
  level: 'info' | 'important' | 'critical';
  audience: 'all' | 'free' | 'premium';
  pinned: boolean;
  createdAt: Millis;
  createdBy: string;
};

// ------------------------------------------------------------ notifications

export type NotificationType =
  | 'new_signal'
  | 'premium_signal'
  | 'signal_update'
  | 'news'
  | 'lesson'
  | 'poll'
  | 'community'
  | 'announcement'
  | 'subscription'
  | 'join_request';

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  /** Deep link target, e.g. `/signal/abc123`. */
  route?: string;
  data?: Record<string, string>;
  read: boolean;
  createdAt: Millis;
};

// ------------------------------------------------------------ market quotes

export type MarketQuote = {
  symbol: string;
  displayName: string;
  price: number;
  change: number;
  changePct: number;
  high?: number;
  low?: number;
  /** Recent closes, oldest first — drives the sparkline. */
  sparkline: number[];
  /** Number of decimals to render; JPY pairs use 3, XAU uses 2. */
  digits: number;
  updatedAt: Millis;
};

// ----------------------------------------------------------- remote config

export type AppSettings = {
  signalLimits: {
    freePerDay: number;
    premiumPerDay: number;
    /** How many past signals a free account can scroll back through. */
    freeHistoryLimit: number;
  };
  features: {
    communityEnabled: boolean;
    pollsEnabled: boolean;
    newsEnabled: boolean;
    educationEnabled: boolean;
    subscriptionsEnabled: boolean;
    requireCommunityApproval: boolean;
  };
  products: {
    monthly: string;
    quarterly: string;
    yearly: string;
  };
  legal: {
    termsUrl: string;
    privacyUrl: string;
    supportEmail: string;
    riskDisclaimer: string;
  };
  maintenance: {
    enabled: boolean;
    message?: string;
  };
  minSupportedVersion?: string;
};

/**
 * Used until the remote document loads, and as the fallback if it is missing.
 * These are defaults, not business rules — the admin panel is the source of
 * truth at runtime.
 */
export const fallbackAppSettings: AppSettings = {
  signalLimits: { freePerDay: 3, premiumPerDay: 6, freeHistoryLimit: 20 },
  features: {
    communityEnabled: true,
    pollsEnabled: true,
    newsEnabled: true,
    educationEnabled: true,
    subscriptionsEnabled: true,
    requireCommunityApproval: true,
  },
  products: {
    monthly: 'fxpulse.premium.monthly',
    quarterly: 'fxpulse.premium.quarterly',
    yearly: 'fxpulse.premium.yearly',
  },
  legal: {
    termsUrl: 'https://fxpulse.app/terms',
    privacyUrl: 'https://fxpulse.app/privacy',
    supportEmail: 'support@fxpulse.app',
    riskDisclaimer:
      'Trading foreign exchange carries a high level of risk and may not be suitable for all investors. All content is educational and informational only, is not investment advice, and no profit is guaranteed. Past performance does not guarantee future results. You are solely responsible for your trading decisions.',
  },
  maintenance: { enabled: false },
};
