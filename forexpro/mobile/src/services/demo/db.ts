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
  NewsArticle,
  PlanId,
  Poll,
  Signal,
  SignalTeaser,
  Subscription,
} from '../../types/models';
import { defaultNotificationPrefs, fallbackAppSettings } from '../../types/models';
import { DEMO_QUOTES } from '../../data/demoMarket';

/**
 * The in-memory database behind demo mode.
 *
 * A tiny observable store plus a hand-written dataset that exercises every
 * state the UI can render: open and closed trades, wins and losses, free and
 * premium content, read and unread notifications, a poll, a course with a quiz,
 * and a chat with replies, reactions, media and a pinned message.
 *
 * Mutations are real — sending a message, voting, completing a lesson and
 * toggling the plan all update the store and re-render every subscriber, so the
 * demo behaves like the live app rather than a static mock.
 */

// ------------------------------------------------------------------ observable

type Listener<T> = (value: T) => void;

export class Observable<T> {
  private listeners = new Set<Listener<T>>();

  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  set(next: T): void {
    this.value = next;
    this.listeners.forEach((listener) => listener(next));
  }

  update(fn: (current: T) => T): void {
    this.set(fn(this.value));
  }

  /** Emits the current value immediately, then on every change. */
  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

// -------------------------------------------------------------------- helpers

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = Date.now();
const ago = (ms: number) => now - ms;

export const DEMO_UID = 'demo-user-001';

// -------------------------------------------------------------------- signals

function signal(partial: Partial<Signal> & Pick<Signal, 'id' | 'pair' | 'direction' | 'entry' | 'stopLoss'>): Signal {
  const publishedAt = partial.publishedAt ?? ago(2 * HOUR);
  return {
    takeProfits: [],
    riskReward: undefined,
    timeframe: 'H4',
    confidence: 'medium',
    status: 'published',
    tradeState: 'active',
    isPremium: false,
    timeline: [{ state: 'published', at: publishedAt }],
    authorId: 'analyst-1',
    authorName: 'Daniel Roth',
    tags: [partial.pair],
    createdAt: publishedAt,
    ...partial,
    publishedAt,
  };
}

const SIGNALS: Signal[] = [
  signal({
    id: 'sig-eurusd-01',
    pair: 'EURUSD',
    direction: 'buy',
    entry: 1.0912,
    stopLoss: 1.0868,
    takeProfits: [
      { level: 1, price: 1.0958, hit: true, hitAt: ago(40 * 60_000) },
      { level: 2, price: 1.1002, hit: false },
      { level: 3, price: 1.1046, hit: false },
    ],
    riskReward: 3.05,
    timeframe: 'H4',
    strategy: 'Demand zone retest',
    confidence: 'high',
    tradeState: 'active',
    publishedAt: ago(3 * HOUR),
    analysis: {
      technical:
        'Price swept the previous session low at 1.0871 and reclaimed the H4 demand zone with a strong bullish close. Structure stays bullish while 1.0868 holds; the first target sits at the prior swing high.',
      fundamental:
        'Softer US data has taken pressure off the euro heading into the ECB decision. A dovish surprise from the ECB is the main risk to this idea.',
    },
    timeline: [
      { state: 'published', at: ago(3 * HOUR) },
      { state: 'active', at: ago(2.5 * HOUR), note: 'Entry filled on the retest.' },
      { state: 'tp1_hit', at: ago(40 * 60_000), note: 'First target reached, stop moved to break even.' },
    ],
  }),
  signal({
    id: 'sig-xauusd-01',
    pair: 'XAUUSD',
    direction: 'sell',
    entry: 2422.4,
    stopLoss: 2436.8,
    takeProfits: [
      { level: 1, price: 2408.0, hit: true, hitAt: ago(20 * HOUR) },
      { level: 2, price: 2394.5, hit: true, hitAt: ago(18 * HOUR) },
    ],
    riskReward: 1.94,
    timeframe: 'H1',
    strategy: 'Supply rejection',
    confidence: 'medium',
    isPremium: true,
    tradeState: 'tp_hit',
    result: 'win',
    pips: 279,
    closedAt: ago(18 * HOUR),
    publishedAt: ago(26 * HOUR),
    analysis: {
      technical:
        'Clean rejection from the H1 supply block with a bearish engulfing close and a lower high on the 15m.',
      fundamental: 'Real yields ticking higher removes some of the bid under gold.',
    },
    timeline: [
      { state: 'published', at: ago(26 * HOUR) },
      { state: 'active', at: ago(24 * HOUR) },
      { state: 'tp1_hit', at: ago(20 * HOUR) },
      { state: 'tp2_hit', at: ago(18 * HOUR) },
      { state: 'closed', at: ago(18 * HOUR), note: 'Both targets filled, position closed.' },
    ],
  }),
  signal({
    id: 'sig-gbpjpy-01',
    pair: 'GBPJPY',
    direction: 'buy',
    entry: 193.15,
    stopLoss: 192.4,
    takeProfits: [{ level: 1, price: 194.65, hit: false }],
    riskReward: 2.0,
    timeframe: 'M30',
    strategy: 'Break and retest',
    confidence: 'low',
    tradeState: 'pending',
    publishedAt: ago(50 * 60_000),
    analysis: {
      technical: 'Waiting for a retest of the broken M30 range high at 193.15. No entry until it holds.',
    },
    timeline: [{ state: 'published', at: ago(50 * 60_000) }],
  }),
  signal({
    id: 'sig-usdjpy-01',
    pair: 'USDJPY',
    direction: 'buy',
    entry: 151.24,
    stopLoss: 150.86,
    takeProfits: [{ level: 1, price: 152.0, hit: false }],
    riskReward: 2.0,
    timeframe: 'H1',
    strategy: 'Trend continuation',
    confidence: 'medium',
    tradeState: 'sl_hit',
    result: 'loss',
    pips: -38,
    closedAt: ago(2 * DAY),
    publishedAt: ago(2.4 * DAY),
    analysis: {
      technical: 'Continuation setup off the H1 trendline. Invalidated when the trendline gave way.',
    },
    timeline: [
      { state: 'published', at: ago(2.4 * DAY) },
      { state: 'active', at: ago(2.2 * DAY) },
      { state: 'sl_hit', at: ago(2 * DAY), note: 'Trendline broke on the US open.' },
    ],
  }),
  signal({
    id: 'sig-gbpusd-01',
    pair: 'GBPUSD',
    direction: 'sell',
    entry: 1.2794,
    stopLoss: 1.2836,
    takeProfits: [
      { level: 1, price: 1.2742, hit: true, hitAt: ago(3 * DAY) },
      { level: 2, price: 1.2698, hit: false },
    ],
    riskReward: 2.29,
    timeframe: 'H4',
    strategy: 'Lower high rejection',
    confidence: 'high',
    isPremium: true,
    tradeState: 'closed',
    result: 'win',
    pips: 52,
    closedAt: ago(3 * DAY),
    publishedAt: ago(3.5 * DAY),
    analysis: {
      technical: 'Rejection from the H4 lower high with momentum divergence.',
      fundamental: 'Weaker UK retail sales added to the downside case.',
    },
    timeline: [
      { state: 'published', at: ago(3.5 * DAY) },
      { state: 'active', at: ago(3.3 * DAY) },
      { state: 'tp1_hit', at: ago(3 * DAY) },
      { state: 'closed', at: ago(3 * DAY), note: 'Closed at first target ahead of the weekend.' },
    ],
  }),
  signal({
    id: 'sig-audusd-01',
    pair: 'AUDUSD',
    direction: 'buy',
    entry: 0.6588,
    stopLoss: 0.6562,
    takeProfits: [{ level: 1, price: 0.664, hit: true, hitAt: ago(4 * DAY) }],
    riskReward: 2.0,
    timeframe: 'H1',
    strategy: 'Range low bounce',
    confidence: 'medium',
    tradeState: 'tp_hit',
    result: 'win',
    pips: 52,
    closedAt: ago(4 * DAY),
    publishedAt: ago(4.5 * DAY),
    timeline: [
      { state: 'published', at: ago(4.5 * DAY) },
      { state: 'active', at: ago(4.3 * DAY) },
      { state: 'tp_hit', at: ago(4 * DAY) },
    ],
  }),
];

/** Premium teasers, exactly as the server projection would build them. */
const TEASERS: SignalTeaser[] = SIGNALS.filter(
  (s) => s.isPremium && s.publishedAt > now - DAY,
).map((s) => ({
  id: s.id,
  pair: s.pair,
  direction: s.direction,
  timeframe: s.timeframe,
  confidence: s.confidence,
  publishedAt: s.publishedAt,
}));

// ----------------------------------------------------------------------- news

const NEWS: NewsArticle[] = [
  {
    id: 'news-fed',
    title: 'Fed holds rates steady, signals patience on cuts',
    summary: 'The FOMC left the target range unchanged and pushed back on an early cut.',
    body: 'The Federal Open Market Committee left rates unchanged, repeating that it needs greater confidence that inflation is moving sustainably toward two percent.\n\nFor FX the immediate reaction was a firmer dollar across the majors. EUR/USD gave back its intraday gains and USD/JPY pressed the top of its recent range.\n\nRate-sensitive pairs are likely to stay headline-driven until the next inflation print. Positioning into the release looks light, which raises the odds of an outsized move in either direction.',
    category: 'central_banks',
    source: 'Market desk',
    isPremium: false,
    status: 'published',
    publishedAt: ago(4 * HOUR),
    createdAt: ago(4 * HOUR),
  },
  {
    id: 'news-gold',
    title: 'Gold consolidates as real yields tick higher',
    summary: 'Bullion is holding a tight range while the rates market reprices.',
    body: 'Gold has spent the week in a narrowing range as higher real yields offset steady central bank demand.\n\nA daily close below the range low at 2394 would open the door to a deeper retracement toward 2360. Until then the path of least resistance remains sideways, and the setup favours fading the extremes rather than chasing a breakout.',
    category: 'gold',
    source: 'Market desk',
    isPremium: true,
    status: 'published',
    publishedAt: ago(9 * HOUR),
    createdAt: ago(9 * HOUR),
  },
  {
    id: 'news-eur',
    title: 'Euro area PMIs beat expectations',
    summary: 'Services led the upside surprise, manufacturing still in contraction.',
    body: 'Composite PMI came in above consensus, driven almost entirely by services. Manufacturing remains below the 50 line for a ninth consecutive month.\n\nThe euro firmed on the release but gave most of it back within the hour, which tells you something about how much the market is willing to price off a single survey.',
    category: 'economy',
    source: 'Market desk',
    isPremium: false,
    status: 'published',
    publishedAt: ago(28 * HOUR),
    createdAt: ago(28 * HOUR),
  },
  {
    id: 'news-usd',
    title: 'Dollar index holds its range ahead of CPI',
    summary: 'DXY is coiling into the print with volatility compressed.',
    body: 'The dollar index has traded a narrowing range for six sessions. Implied volatility has compressed to the low end of its three-month distribution, which historically resolves with an expansion rather than more of the same.\n\nFor traders, that argues for smaller size into the release and a plan for both directions rather than a directional bet.',
    category: 'usd',
    source: 'Market desk',
    isPremium: false,
    status: 'published',
    publishedAt: ago(2 * DAY),
    createdAt: ago(2 * DAY),
  },
  {
    id: 'news-boj',
    title: 'BoJ leaves policy unchanged, yen slips',
    summary: 'No change to the policy rate; the yen weakened on the guidance.',
    body: 'The Bank of Japan left policy unchanged and offered little in the way of forward guidance. USD/JPY pushed to a fresh local high on the announcement.\n\nIntervention risk rises with every figure higher, which is worth factoring into position size on any long dollar-yen idea.',
    category: 'central_banks',
    source: 'Market desk',
    isPremium: true,
    status: 'published',
    publishedAt: ago(3 * DAY),
    createdAt: ago(3 * DAY),
  },
];

// ------------------------------------------------------------------ education

const COURSES: Course[] = [
  {
    id: 'course-basics',
    title: 'Forex Foundations',
    description: 'The vocabulary, mechanics and risk rules every trader needs before the first trade.',
    category: 'forex_basics',
    level: 'beginner',
    isPremium: false,
    lessonCount: 3,
    estimatedMinutes: 24,
    order: 1,
    status: 'published',
    createdAt: ago(30 * DAY),
  },
  {
    id: 'course-risk',
    title: 'Risk Management That Survives',
    description: 'Position sizing, expectancy and the maths of drawdown.',
    category: 'risk_management',
    level: 'beginner',
    isPremium: false,
    lessonCount: 2,
    estimatedMinutes: 18,
    order: 2,
    status: 'published',
    createdAt: ago(25 * DAY),
  },
  {
    id: 'course-smc',
    title: 'Smart Money Concepts',
    description: 'Order blocks, liquidity sweeps and market structure shifts, taught from real charts.',
    category: 'smc',
    level: 'intermediate',
    isPremium: true,
    lessonCount: 2,
    estimatedMinutes: 32,
    order: 3,
    status: 'published',
    createdAt: ago(20 * DAY),
  },
  {
    id: 'course-psych',
    title: 'Trading Psychology',
    description: 'Why good traders break their own rules, and the systems that stop it.',
    category: 'trading_psychology',
    level: 'intermediate',
    isPremium: true,
    lessonCount: 1,
    estimatedMinutes: 14,
    order: 4,
    status: 'published',
    createdAt: ago(12 * DAY),
  },
];

const LESSONS: Record<string, Lesson[]> = {
  'course-basics': [
    {
      id: 'l-basics-1',
      courseId: 'course-basics',
      title: 'How a currency pair actually works',
      type: 'text',
      summary: 'Base, quote, pips and what you are really buying.',
      content:
        'A currency pair quotes the value of one currency against another. In EUR/USD the euro is the base currency and the dollar is the quote currency. Buying EUR/USD means buying euros and selling dollars in the same trade — there is no way to hold one side alone.\n\nA pip is the standard increment of movement: 0.0001 for most pairs, and 0.01 for pairs quoted against the yen. What a pip is worth to your account depends entirely on position size, not on the pip count itself.\n\nThat distinction matters more than it sounds. Two traders can take the same setup, both be right, and end the month with completely different results — because one sized the trade to the stop and the other sized it to how confident they felt.',
      durationMinutes: 8,
      order: 1,
      isPremium: false,
    },
    {
      id: 'l-basics-2',
      courseId: 'course-basics',
      title: 'Risk per trade and position sizing',
      type: 'text',
      summary: 'The one habit that separates survivors from the rest.',
      content:
        'Decide the percentage of your account you are willing to lose on a single trade before you look at a chart. One percent is a common starting point and it is deliberately boring.\n\nPosition size follows from that number and your stop distance, never the other way around. If the setup needs a wide stop, the position gets smaller. If you find yourself widening a stop to keep the position size, you have stopped managing risk and started hoping.\n\nWork one example by hand and it sticks: a 10,000 account, one percent risk, a 40 pip stop on EUR/USD. Risk is 100. At roughly 10 per pip on a standard lot, 100 / 40 pips gives 2.5 per pip — a 0.25 lot position.',
      durationMinutes: 10,
      order: 2,
      isPremium: false,
    },
    {
      id: 'l-basics-3',
      courseId: 'course-basics',
      title: 'Check your understanding',
      type: 'quiz',
      summary: 'Three questions on the basics.',
      durationMinutes: 6,
      order: 3,
      isPremium: false,
      quiz: [
        {
          id: 'q1',
          question: 'In EUR/USD, which currency is the base?',
          options: ['USD', 'EUR', 'Both', 'Neither'],
          correctIndex: 1,
          explanation: 'The base currency is always the one listed first.',
        },
        {
          id: 'q2',
          question: 'What determines your position size?',
          options: [
            'How confident you feel about the setup',
            'Your risk per trade and your stop distance',
            'The size of your account alone',
            'The spread',
          ],
          correctIndex: 1,
          explanation:
            'Risk amount divided by stop distance gives position size. Confidence is not an input.',
        },
        {
          id: 'q3',
          question: 'One pip on EUR/USD is:',
          options: ['0.01', '0.001', '0.0001', '1.0'],
          correctIndex: 2,
          explanation: 'Most pairs move in 0.0001 increments; yen pairs use 0.01.',
        },
      ],
    },
  ],
  'course-risk': [
    {
      id: 'l-risk-1',
      courseId: 'course-risk',
      title: 'Expectancy, not win rate',
      type: 'text',
      summary: 'Why a 40% win rate can beat a 70% win rate.',
      content:
        'Expectancy is the average amount you expect to make per trade: (win rate x average win) minus (loss rate x average loss).\n\nA strategy that wins 40% of the time at 3R per win and loses 1R per loss has an expectancy of (0.4 x 3) - (0.6 x 1) = +0.6R. A strategy that wins 70% of the time at 0.5R and loses 1R has (0.7 x 0.5) - (0.3 x 1) = +0.05R.\n\nThe second one feels far better to trade and makes a twelfth of the money. Feeling right is not the objective.',
      durationMinutes: 9,
      order: 1,
      isPremium: false,
    },
    {
      id: 'l-risk-2',
      courseId: 'course-risk',
      title: 'The maths of drawdown',
      type: 'text',
      summary: 'Recovery is not symmetric with loss.',
      content:
        'A 10% drawdown needs an 11% gain to recover. A 50% drawdown needs 100%. The asymmetry is brutal and it is the entire argument for small, fixed risk.\n\nAt one percent risk per trade, ten consecutive losses — which will happen — costs about 9.6% of the account. At five percent risk, the same losing streak costs 40%, and you now need to make 67% just to get back to where you started, while trading scared.',
      durationMinutes: 9,
      order: 2,
      isPremium: false,
    },
  ],
  'course-smc': [
    {
      id: 'l-smc-1',
      courseId: 'course-smc',
      title: 'Market structure and the shift',
      type: 'text',
      summary: 'Reading higher highs, lower lows and the moment the trend changes.',
      content:
        'Market structure is the sequence of swing highs and lows. An uptrend makes higher highs and higher lows; a downtrend makes the opposite. A structure shift is the first lower low in an uptrend, or the first higher high in a downtrend.\n\nThe shift is not a signal on its own — it is a change of context that tells you which side of the market to be hunting setups on.',
      durationMinutes: 16,
      order: 1,
      isPremium: true,
    },
    {
      id: 'l-smc-2',
      courseId: 'course-smc',
      title: 'Liquidity sweeps and order blocks',
      type: 'text',
      summary: 'Where stops sit, and why price goes to get them.',
      content:
        'Clusters of stop orders sit in obvious places: above a swing high, below a swing low, at a round number. A sweep is price trading through that level and immediately reversing.\n\nThe order block is the last opposing candle before the impulsive move that follows. Trading it means waiting for price to return to that zone with structure already on your side — not buying the sweep itself.',
      durationMinutes: 16,
      order: 2,
      isPremium: true,
    },
  ],
  'course-psych': [
    {
      id: 'l-psych-1',
      courseId: 'course-psych',
      title: 'Why you break your own rules',
      type: 'text',
      summary: 'Revenge trading, FOMO, and the system that prevents both.',
      content:
        'Rules are broken in predictable states: after a loss (revenge), after a missed move (FOMO), and after a winning streak (invincibility). Each has the same root — an urge to act being mistaken for a signal.\n\nThe fix is procedural, not emotional. A written checklist that must be completed before an entry, a hard daily loss limit that closes the platform, and a journal entry required within an hour of every trade. None of these require willpower in the moment, which is exactly why they work.',
      durationMinutes: 14,
      order: 1,
      isPremium: true,
    },
  ],
};

// ---------------------------------------------------------------- community

const MEMBERS: CommunityMember[] = [
  { uid: 'analyst-1', displayName: 'Daniel Roth', username: 'danielr', role: 'admin', plan: 'premium', status: 'approved', joinedAt: ago(200 * DAY), lastSeenAt: ago(2 * 60_000) },
  { uid: 'mod-1', displayName: 'Amara Osei', username: 'amara', role: 'moderator', plan: 'premium', status: 'approved', joinedAt: ago(160 * DAY), lastSeenAt: ago(4 * 60_000) },
  { uid: DEMO_UID, displayName: 'Alex Morgan', username: 'alexm', role: 'user', plan: 'free', status: 'approved', joinedAt: ago(21 * DAY), lastSeenAt: now },
  { uid: 'm-2', displayName: 'Priya Nair', username: 'priyan', role: 'user', plan: 'premium', status: 'approved', joinedAt: ago(90 * DAY), lastSeenAt: ago(60_000) },
  { uid: 'm-3', displayName: 'Tomás Silva', username: 'tsilva', role: 'user', plan: 'free', status: 'approved', joinedAt: ago(45 * DAY), lastSeenAt: ago(30 * 60_000) },
  { uid: 'm-4', displayName: 'Lena Fischer', username: 'lenaf', role: 'user', plan: 'premium', status: 'approved', joinedAt: ago(70 * DAY), lastSeenAt: ago(3 * 60_000) },
  { uid: 'm-5', displayName: 'Kwame Boateng', username: 'kwameb', role: 'user', plan: 'free', status: 'approved', joinedAt: ago(15 * DAY), lastSeenAt: ago(2 * HOUR) },
];

function message(partial: Partial<Message> & Pick<Message, 'id' | 'authorId' | 'createdAt'>): Message {
  const author = MEMBERS.find((m) => m.uid === partial.authorId);
  return {
    authorName: author?.displayName ?? 'Member',
    authorRole: author?.role ?? 'user',
    authorPlan: author?.plan ?? 'free',
    type: 'text',
    reactions: {},
    pinned: false,
    deleted: false,
    ...partial,
  };
}

/** Newest first, matching the Firestore ordering the repositories use. */
const MESSAGES: Message[] = [
  message({
    id: 'msg-12',
    authorId: 'm-2',
    createdAt: ago(3 * 60_000),
    text: 'Took the retest, stop under the wick. Same idea as the signal but a tighter entry.',
    reactions: { '🔥': ['analyst-1', 'm-4'] },
  }),
  message({
    id: 'msg-11',
    authorId: DEMO_UID,
    createdAt: ago(7 * 60_000),
    text: 'Missed the first entry. Waiting for the pullback rather than chasing it.',
  }),
  message({
    id: 'msg-10',
    authorId: 'analyst-1',
    createdAt: ago(12 * 60_000),
    text: 'EUR/USD hit TP1. Stop to break even on the runner — leave the rest to the London close.',
    reactions: { '👍': ['m-2', 'm-3', DEMO_UID], '📈': ['m-4'] },
  }),
  message({
    id: 'msg-9',
    authorId: 'm-4',
    createdAt: ago(26 * 60_000),
    type: 'image',
    text: 'My H1 view — same demand zone, marked the sweep.',
    media: { url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=70', width: 800, height: 600 },
    reactions: { '👍': ['analyst-1'] },
  }),
  message({
    id: 'msg-8',
    authorId: 'mod-1',
    createdAt: ago(48 * 60_000),
    text: 'Reminder: post a chart with your bias. "I think it goes up" is not analysis.',
    pinned: true,
    reactions: { '🙏': ['m-3', 'm-5', DEMO_UID], '👍': ['m-2'] },
  }),
  message({
    id: 'msg-7',
    authorId: 'm-3',
    createdAt: ago(70 * 60_000),
    type: 'audio',
    media: { url: 'demo://voice-note-1', durationMs: 24_000, waveform: [0.3, 0.6, 0.8, 0.5, 0.9, 0.4, 0.7, 0.35, 0.62, 0.85, 0.42, 0.55] },
  }),
  message({
    id: 'msg-6',
    authorId: 'm-5',
    createdAt: ago(95 * 60_000),
    text: 'Is anyone else seeing the divergence on the 15m or am I drawing lines on noise again',
    reactions: { '😂': ['m-3', 'm-2', 'm-4'] },
  }),
  message({
    id: 'msg-5',
    authorId: 'analyst-1',
    createdAt: ago(2 * HOUR),
    text: 'Both. The divergence is real, the 15m timeframe is the noise. Zoom out to H1.',
    replyTo: { id: 'msg-6', authorName: 'Kwame Boateng', preview: 'Is anyone else seeing the divergence on the 15m…' },
    reactions: { '🔥': ['m-5', 'm-3', 'm-2', 'm-4', DEMO_UID] },
  }),
  message({
    id: 'msg-4',
    authorId: 'm-2',
    createdAt: ago(5 * HOUR),
    text: 'Gold closed both targets overnight. Best R of the week for me.',
    reactions: { '📈': ['analyst-1', 'm-4'] },
  }),
  message({
    id: 'msg-3',
    authorId: 'mod-1',
    createdAt: ago(23 * HOUR),
    type: 'system',
    text: 'Lena Fischer joined the community',
  }),
  message({
    id: 'msg-2',
    authorId: 'analyst-1',
    createdAt: ago(26 * HOUR),
    text: 'Daily brief is up. CPI at 13:30 — size down into it, the range has been compressing for six sessions.',
    reactions: { '👍': ['m-2', 'm-3', 'm-4', 'm-5'] },
  }),
  message({
    id: 'msg-1',
    authorId: 'm-3',
    createdAt: ago(28 * HOUR),
    text: 'Morning all. Watching DXY for direction before I touch anything.',
  }),
];

// -------------------------------------------------------------------- polls

const POLL: Poll = {
  id: 'poll-eurusd',
  question: 'Where do you think EUR/USD is heading this week?',
  description: 'Vote before the London open.',
  type: 'weekly',
  options: [
    { id: 'bullish', label: 'Bullish', votes: 34 },
    { id: 'bearish', label: 'Bearish', votes: 19 },
    { id: 'sideways', label: 'Sideways', votes: 12 },
  ],
  totalVotes: 65,
  allowMultiple: false,
  isActive: true,
  expiresAt: now + 3 * DAY,
  createdAt: ago(20 * HOUR),
  createdBy: 'analyst-1',
};

// ------------------------------------------------------------ notifications

const NOTIFICATIONS: AppNotification[] = [
  { id: 'n-1', type: 'signal_update', title: 'EUR/USD · Take profit hit', body: '+46 pips on the first target.', route: '/signal/sig-eurusd-01', read: false, createdAt: ago(40 * 60_000) },
  { id: 'n-2', type: 'new_signal', title: 'BUY GBP/JPY', body: 'New signal published · M30', route: '/signal/sig-gbpjpy-01', read: false, createdAt: ago(50 * 60_000) },
  { id: 'n-3', type: 'community', title: 'Daniel Roth mentioned you', body: 'Both. The divergence is real, the 15m timeframe is the noise.', route: '/chat', read: false, createdAt: ago(2 * HOUR) },
  { id: 'n-4', type: 'news', title: 'Fed holds rates steady', body: 'The FOMC left the target range unchanged.', route: '/news/news-fed', read: true, createdAt: ago(4 * HOUR) },
  { id: 'n-5', type: 'poll', title: 'New community poll', body: 'Where do you think EUR/USD is heading this week?', route: '/(tabs)/community', read: true, createdAt: ago(20 * HOUR) },
  { id: 'n-6', type: 'premium_signal', title: 'SELL XAU/USD — Premium', body: 'A new premium signal was published.', route: '/premium', read: true, createdAt: ago(26 * HOUR) },
  { id: 'n-7', type: 'lesson', title: 'New lesson available', body: 'Trading Psychology · Why you break your own rules', route: '/course/course-psych', read: true, createdAt: ago(2 * DAY) },
];

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Weekly review — Sunday 18:00 UTC',
    body: 'We will go through every signal from the week, what worked, what did not, and why. Bring your own charts.',
    level: 'important',
    audience: 'all',
    pinned: true,
    createdAt: ago(8 * HOUR),
    createdBy: 'analyst-1',
  },
  {
    id: 'ann-2',
    title: 'New SMC module published',
    body: 'Two lessons on market structure and liquidity sweeps are now live in the Learn tab.',
    level: 'info',
    audience: 'all',
    pinned: false,
    createdAt: ago(2 * DAY),
    createdBy: 'analyst-1',
  },
];

// -------------------------------------------------------------- daily state

const TODAY_STATS: DailyStats = {
  day: new Date().toISOString().slice(0, 10),
  signals: 3,
  wins: 2,
  losses: 1,
  breakeven: 0,
  winRate: 66.7,
  avgRR: 2.33,
  totalPips: 293,
};

const BRIEF: DailyBrief = {
  id: new Date().toISOString().slice(0, 10),
  mood: 'mixed',
  headline: 'Dollar firm into the data, gold pinned in range',
  summary:
    'Rate expectations are doing the heavy lifting today. Majors are rangebound ahead of the US print and gold is holding a tight consolidation. The compression in implied volatility argues for an expansion rather than more of the same.',
  majorPairs: [
    { pair: 'EURUSD', bias: 'neutral', note: 'Range between 1.0870 and 1.0960' },
    { pair: 'GBPUSD', bias: 'bearish', note: 'Lower highs on H4' },
    { pair: 'XAUUSD', bias: 'neutral', note: 'Waiting on real yields' },
    { pair: 'USDJPY', bias: 'bullish', note: 'Intervention risk rising' },
  ],
  events: [
    { time: '13:30', title: 'US CPI (m/m)', impact: 'high' },
    { time: '15:00', title: 'US consumer sentiment', impact: 'medium' },
    { time: '18:00', title: 'FOMC member speech', impact: 'low' },
  ],
  keyLevels: [
    { pair: 'EURUSD', support: '1.0868', resistance: '1.0962' },
    { pair: 'XAUUSD', support: '2394', resistance: '2437' },
    { pair: 'GBPJPY', support: '192.40', resistance: '194.65' },
  ],
  focus: 'Let the CPI print settle before taking a directional position on the dollar.',
  isPremium: false,
  publishedAt: ago(7 * HOUR),
};

const COMMUNITY: CommunityInfo = {
  id: 'main',
  name: 'Trading Floor',
  description: 'A private, moderated room for serious traders.',
  memberCount: MEMBERS.length,
  onlineCount: 4,
  pinnedMessageId: 'msg-8',
  dailyTopic: {
    title: 'Where is USD strength heading this week?',
    body: 'Share your bias with a chart. Focus on DXY structure and the upcoming rate decision.',
    postedAt: ago(9 * HOUR),
  },
  rules: [
    'No financial advice — share analysis, not instructions.',
    'No signal reselling or account management offers.',
    'Back your take with a chart or a reason.',
    'Respect other members. No spam, no self-promotion.',
  ],
  updatedAt: ago(9 * HOUR),
};

const DEMO_USER: AppUser = {
  uid: DEMO_UID,
  fullName: 'Alex Morgan',
  username: 'alexm',
  email: 'alex@demo.fxpulse.app',
  phone: '+15550001234',
  bio: 'Swing trader focused on the majors and gold. Learning SMC properly this year.',
  address: { city: 'Lisbon', country: 'Portugal' },
  role: 'user',
  plan: 'free',
  status: 'active',
  community: { status: 'approved', joinedAt: ago(21 * DAY) },
  notificationPrefs: defaultNotificationPrefs,
  themePreference: 'dark',
  onboardingCompleted: true,
  createdAt: ago(21 * DAY),
  lastLoginAt: now,
  platform: 'android',
  appVersion: '1.0.0',
  stats: { lessonsCompleted: 2, messagesSent: 14 },
};

const PROGRESS: Record<string, LessonProgress> = {
  'l-basics-1': { lessonId: 'l-basics-1', courseId: 'course-basics', completed: true, completedAt: ago(6 * DAY) },
  'l-basics-2': { lessonId: 'l-basics-2', courseId: 'course-basics', completed: true, completedAt: ago(5 * DAY) },
};

// ------------------------------------------------------------------ the store

export const demoDb = {
  user: new Observable<AppUser>(DEMO_USER),
  subscription: new Observable<Subscription | null>(null),
  signals: new Observable<Signal[]>(SIGNALS),
  teasers: new Observable<SignalTeaser[]>(TEASERS),
  stats: new Observable<DailyStats>(TODAY_STATS),
  brief: new Observable<DailyBrief>(BRIEF),
  news: new Observable<NewsArticle[]>(NEWS),
  courses: new Observable<Course[]>(COURSES),
  progress: new Observable<Record<string, LessonProgress>>(PROGRESS),
  community: new Observable<CommunityInfo>(COMMUNITY),
  messages: new Observable<Message[]>(MESSAGES),
  members: new Observable<CommunityMember[]>(MEMBERS),
  joinRequest: new Observable<JoinRequest | null>(null),
  poll: new Observable<Poll>(POLL),
  myVote: new Observable<string[] | null>(null),
  notifications: new Observable<AppNotification[]>(NOTIFICATIONS),
  announcements: new Observable<Announcement[]>(ANNOUNCEMENTS),
  quotes: new Observable<MarketQuote[]>(DEMO_QUOTES),
  settings: new Observable<AppSettings>(fallbackAppSettings),
};

export function lessonsFor(courseId: string): Lesson[] {
  return LESSONS[courseId] ?? [];
}

export function allLessons(): Lesson[] {
  return Object.values(LESSONS).flat();
}

/**
 * Flips the demo account between tiers.
 *
 * This is what makes a single test build useful for both audiences: the same
 * APK can demonstrate the locked free experience and the full premium one
 * without a rebuild or a store purchase.
 */
export function setDemoPlan(plan: PlanId): void {
  demoDb.user.update((user) => ({
    ...user,
    plan,
    planExpiresAt: plan === 'premium' ? now + 30 * DAY : undefined,
    planSource: plan === 'premium' ? 'manual' : undefined,
  }));

  demoDb.subscription.set(
    plan === 'premium'
      ? {
          uid: DEMO_UID,
          plan: 'premium',
          status: 'active',
          productId: 'fxpulse.premium.yearly',
          store: 'manual',
          startedAt: now,
          expiresAt: now + 30 * DAY,
          autoRenewing: true,
          environment: 'sandbox',
          lastVerifiedAt: now,
        }
      : null,
  );

  demoDb.members.update((members) =>
    members.map((m) => (m.uid === DEMO_UID ? { ...m, plan } : m)),
  );
}

let messageCounter = 1000;
export function nextMessageId(): string {
  messageCounter += 1;
  return `msg-local-${messageCounter}`;
}
