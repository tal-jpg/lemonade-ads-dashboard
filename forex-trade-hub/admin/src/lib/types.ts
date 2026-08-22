import { Timestamp } from 'firebase/firestore';

/**
 * Admin-side view of the domain model.
 *
 * Mirrors mobile/src/types/models.ts; docs/DATA_MODEL.md is the source of truth
 * for both. Timestamps are normalised to epoch millis at the mapper boundary,
 * exactly as in the app.
 */

export type Millis = number;
export type UserRole = 'user' | 'moderator' | 'admin';
export type PlanId = 'free' | 'premium';
export type AccountStatus = 'active' | 'suspended' | 'banned';
export type CommunityStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'blocked';

export function ms(value: unknown, fallback = 0): Millis {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  return fallback;
}

export type AdminUser = {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  plan: PlanId;
  status: AccountStatus;
  communityStatus: CommunityStatus;
  createdAt: Millis;
  lastLoginAt?: Millis;
  planExpiresAt?: Millis;
  platform?: string;
};

export type AdminSignal = {
  id: string;
  pair: string;
  direction: 'buy' | 'sell';
  entry: number;
  stopLoss: number;
  takeProfits: { level: number; price: number; hit: boolean }[];
  riskReward?: number;
  timeframe: string;
  strategy?: string;
  confidence: 'low' | 'medium' | 'high';
  chartUrl?: string;
  analysis?: { technical?: string; fundamental?: string };
  status: 'draft' | 'published' | 'cancelled';
  tradeState: 'pending' | 'active' | 'tp_hit' | 'sl_hit' | 'closed' | 'cancelled';
  result?: 'win' | 'loss' | 'breakeven';
  pips?: number;
  isPremium: boolean;
  authorName: string;
  publishedAt: Millis;
};

export type AdminNews = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string;
  imageUrl?: string;
  source?: string;
  isPremium: boolean;
  status: 'draft' | 'published';
  publishedAt: Millis;
};

export type AdminCourse = {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  isPremium: boolean;
  lessonCount: number;
  status: 'draft' | 'published';
  order: number;
};

export type AdminJoinRequest = {
  uid: string;
  fullName: string;
  username: string;
  email: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  createdAt: Millis;
};

export type AdminPoll = {
  id: string;
  question: string;
  type: string;
  options: { id: string; label: string; votes: number }[];
  totalVotes: number;
  isActive: boolean;
  allowMultiple: boolean;
  createdAt: Millis;
};

export type AdminMessage = {
  id: string;
  authorId: string;
  authorName: string;
  text?: string;
  type: string;
  pinned: boolean;
  deleted: boolean;
  createdAt: Millis;
};

export type AdminSubscription = {
  uid: string;
  plan: PlanId;
  status: string;
  productId?: string;
  store?: string;
  expiresAt?: Millis;
  autoRenewing?: boolean;
};

export type DailyStats = {
  day: string;
  signals: number;
  wins: number;
  losses: number;
  winRate: number;
  avgRR: number;
};

export const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD',
  'EURJPY', 'GBPJPY', 'EURGBP', 'XAUUSD', 'XAGUSD', 'US30', 'NAS100',
] as const;

export const TIMEFRAMES = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'] as const;

export const NEWS_CATEGORIES = [
  'forex', 'economy', 'central_banks', 'interest_rates', 'gold', 'usd', 'global_markets',
] as const;

export const COURSE_CATEGORIES = [
  'forex_basics', 'technical_analysis', 'fundamental_analysis', 'smc', 'ict',
  'risk_management', 'trading_psychology', 'advanced',
] as const;
