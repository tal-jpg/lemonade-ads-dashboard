/**
 * Seeds a fresh Firebase project with everything the app needs to run:
 * settings, the community room, market quotes, a course, news, a poll and a few
 * signals — and promotes one account to administrator.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
 *   export FIREBASE_PROJECT_ID=your-project-id
 *   export ADMIN_EMAIL=you@example.com      # must already be registered
 *   npx ts-node scripts/seed.ts
 *
 * Safe to re-run: every write is idempotent (fixed document ids + merge).
 */
import * as admin from 'firebase-admin';

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('FIREBASE_PROJECT_ID is required.');
  process.exit(1);
}

admin.initializeApp({ projectId });
const db = admin.firestore();
const auth = admin.auth();
const now = admin.firestore.Timestamp.now;

async function seedSettings() {
  await db.collection('app_settings').doc('config').set(
    {
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
        monthly: 'forextradehub.premium.monthly',
        quarterly: 'forextradehub.premium.quarterly',
        yearly: 'forextradehub.premium.yearly',
      },
      legal: {
        termsUrl: 'https://forextradehub.app/terms',
        privacyUrl: 'https://forextradehub.app/privacy',
        supportEmail: 'support@forextradehub.app',
        riskDisclaimer:
          'Trading foreign exchange carries a high level of risk and may not be suitable for all investors. All content is educational and informational only, is not investment advice, and no profit is guaranteed. Past performance does not guarantee future results. You are solely responsible for your trading decisions.',
      },
      maintenance: { enabled: false },
    },
    { merge: true },
  );
  console.log('✓ app_settings/config');
}

async function seedCommunity() {
  await db.collection('community').doc('main').set(
    {
      name: 'Trading Floor',
      description: 'A private, moderated room for serious traders.',
      memberCount: 0,
      onlineCount: 0,
      rules: [
        'No financial advice — share analysis, not instructions.',
        'No signal reselling or account management offers.',
        'Back your take with a chart or a reason.',
        'Respect other members. No spam, no self-promotion.',
      ],
      dailyTopic: {
        title: 'Where is USD strength heading this week?',
        body: 'Share your bias with a chart. Focus on DXY structure and the upcoming rate decision.',
        postedAt: now(),
      },
      updatedAt: now(),
    },
    { merge: true },
  );
  console.log('✓ community/main');
}

async function seedQuotes() {
  const quotes = [
    { symbol: 'EURUSD', displayName: 'EUR/USD', price: 1.09242, changePct: 0.18, digits: 5 },
    { symbol: 'GBPUSD', displayName: 'GBP/USD', price: 1.27815, changePct: -0.24, digits: 5 },
    { symbol: 'USDJPY', displayName: 'USD/JPY', price: 151.482, changePct: 0.31, digits: 3 },
    { symbol: 'XAUUSD', displayName: 'XAU/USD', price: 2418.65, changePct: 0.92, digits: 2 },
    { symbol: 'GBPJPY', displayName: 'GBP/JPY', price: 193.622, changePct: -0.11, digits: 3 },
  ];

  const batch = db.batch();
  for (const quote of quotes) {
    const change = (quote.price * quote.changePct) / 100;
    const sparkline = Array.from({ length: 24 }, (_, i) =>
      Number((quote.price - change + (change / 23) * i).toFixed(quote.digits)),
    );
    batch.set(
      db.collection('market_quotes').doc(quote.symbol),
      {
        ...quote,
        change: Number(change.toFixed(quote.digits)),
        high: Number((quote.price + Math.abs(change) * 1.4).toFixed(quote.digits)),
        low: Number((quote.price - Math.abs(change) * 1.2).toFixed(quote.digits)),
        sparkline,
        updatedAt: now(),
      },
      { merge: true },
    );
  }
  await batch.commit();
  console.log(`✓ market_quotes (${quotes.length})`);
}

async function seedSignals(authorId: string, authorName: string) {
  const signals = [
    {
      id: 'seed-eurusd-buy',
      pair: 'EURUSD',
      direction: 'buy',
      entry: 1.0912,
      stopLoss: 1.0868,
      takeProfits: [
        { level: 1, price: 1.0958, hit: true },
        { level: 2, price: 1.1002, hit: false },
        { level: 3, price: 1.1046, hit: false },
      ],
      riskReward: 3.05,
      timeframe: 'H4',
      strategy: 'Demand zone retest',
      confidence: 'high',
      isPremium: false,
      tradeState: 'active',
      analysis: {
        technical:
          'Price swept the previous session low and reclaimed the H4 demand zone with a strong close. Structure remains bullish while 1.0868 holds.',
        fundamental:
          'Softer US data has taken pressure off the euro into the ECB decision. A dovish surprise is the main risk to this idea.',
      },
    },
    {
      id: 'seed-xauusd-sell',
      pair: 'XAUUSD',
      direction: 'sell',
      entry: 2422.4,
      stopLoss: 2436.8,
      takeProfits: [
        { level: 1, price: 2408.0, hit: true },
        { level: 2, price: 2394.5, hit: true },
      ],
      riskReward: 1.94,
      timeframe: 'H1',
      strategy: 'Supply rejection',
      confidence: 'medium',
      isPremium: true,
      tradeState: 'tp_hit',
      result: 'win',
      pips: 279,
      analysis: {
        technical: 'Clean rejection from the H1 supply block with a bearish engulfing close.',
        fundamental: 'Real yields ticking higher removes some of the bid under gold.',
      },
    },
    {
      id: 'seed-gbpjpy-buy',
      pair: 'GBPJPY',
      direction: 'buy',
      entry: 193.15,
      stopLoss: 192.4,
      takeProfits: [{ level: 1, price: 194.65, hit: false }],
      riskReward: 2.0,
      timeframe: 'M30',
      strategy: 'Break and retest',
      confidence: 'low',
      isPremium: true,
      tradeState: 'pending',
      analysis: { technical: 'Waiting for a retest of the broken M30 range high.' },
    },
  ];

  for (const signal of signals) {
    const publishedAt = now();
    await db
      .collection('signals')
      .doc(signal.id)
      .set(
        {
          ...signal,
          status: 'published',
          authorId,
          authorName,
          tags: [signal.pair],
          timeline: [
            { state: 'published', at: publishedAt },
            ...(signal.tradeState !== 'pending' ? [{ state: 'active', at: publishedAt }] : []),
          ],
          publishedAt,
          createdAt: publishedAt,
        },
        { merge: true },
      );

    if (signal.isPremium) {
      await db.collection('signal_teasers').doc(signal.id).set({
        pair: signal.pair,
        direction: signal.direction,
        timeframe: signal.timeframe,
        confidence: signal.confidence,
        publishedAt,
      });
    }
  }
  console.log(`✓ signals (${signals.length})`);
}

async function seedNews() {
  const articles = [
    {
      id: 'seed-news-fed',
      title: 'Fed holds rates steady, signals patience on cuts',
      summary:
        'The FOMC left the target range unchanged and pushed back on expectations of an early cut.',
      body:
        'The Federal Open Market Committee left rates unchanged, repeating that it needs greater confidence that inflation is moving sustainably toward two percent.\n\nFor FX, the immediate reaction was a firmer dollar across the majors, with EUR/USD giving back its intraday gains and USD/JPY pressing the top of its recent range. Rate-sensitive pairs are likely to stay headline-driven until the next inflation print.',
      category: 'central_banks',
      source: 'Market desk',
      isPremium: false,
    },
    {
      id: 'seed-news-gold',
      title: 'Gold consolidates as real yields tick higher',
      summary: 'Bullion is holding a tight range while the rates market reprices.',
      body:
        'Gold has spent the week in a narrowing range as higher real yields offset steady central bank demand.\n\nA daily close below the range low would open the door to a deeper retracement; until then, the path of least resistance remains sideways.',
      category: 'gold',
      source: 'Market desk',
      isPremium: true,
    },
  ];

  for (const article of articles) {
    await db
      .collection('news')
      .doc(article.id)
      .set({ ...article, status: 'published', publishedAt: now(), createdAt: now() }, { merge: true });
  }
  console.log(`✓ news (${articles.length})`);
}

async function seedCourse() {
  const courseId = 'seed-forex-basics';
  await db.collection('courses').doc(courseId).set(
    {
      title: 'Forex Foundations',
      description:
        'The vocabulary, mechanics and risk rules every trader needs before placing a first trade.',
      category: 'forex_basics',
      level: 'beginner',
      isPremium: false,
      lessonCount: 3,
      estimatedMinutes: 24,
      order: 1,
      status: 'published',
      createdAt: now(),
    },
    { merge: true },
  );

  const lessons = [
    {
      id: 'lesson-1',
      title: 'How a currency pair actually works',
      type: 'text',
      summary: 'Base, quote, pips and what you are really buying.',
      content:
        'A currency pair quotes the value of one currency against another. In EUR/USD, the euro is the base currency and the dollar is the quote currency...\n\nA pip is the standard increment of movement: 0.0001 for most pairs, and 0.01 for pairs quoted against the yen. Position size, not pip count, determines what a move is worth to your account.',
      durationMinutes: 8,
      order: 1,
      isPremium: false,
    },
    {
      id: 'lesson-2',
      title: 'Risk per trade and position sizing',
      type: 'text',
      summary: 'The one habit that separates survivors from the rest.',
      content:
        'Decide the percentage of your account you are willing to lose on a single trade before you look at the chart. One percent is a common starting point.\n\nPosition size follows from that number and your stop distance — never the other way around. If the stop has to be wide, the position gets smaller.',
      durationMinutes: 10,
      order: 2,
      isPremium: false,
    },
    {
      id: 'lesson-3',
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
            'How confident you feel',
            'Your risk per trade and your stop distance',
            'The size of your account only',
            'The spread',
          ],
          correctIndex: 1,
          explanation:
            'Risk amount divided by stop distance gives the position size. Confidence is not an input.',
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
  ];

  for (const lesson of lessons) {
    await db
      .collection('courses')
      .doc(courseId)
      .collection('lessons')
      .doc(lesson.id)
      .set({ ...lesson, courseId }, { merge: true });
  }
  console.log(`✓ course + ${lessons.length} lessons`);
}

async function seedPoll(createdBy: string) {
  await db.collection('polls').doc('seed-poll-eurusd').set(
    {
      question: 'Where do you think EUR/USD is heading this week?',
      description: 'Vote before the London open.',
      type: 'weekly',
      options: [
        { id: 'bullish', label: 'Bullish', votes: 0 },
        { id: 'bearish', label: 'Bearish', votes: 0 },
        { id: 'sideways', label: 'Sideways', votes: 0 },
      ],
      totalVotes: 0,
      allowMultiple: false,
      isActive: true,
      createdAt: now(),
      createdBy,
    },
    { merge: true },
  );
  console.log('✓ poll');
}

async function seedBrief() {
  const day = new Date().toISOString().slice(0, 10);
  await db.collection('daily_briefs').doc(day).set(
    {
      mood: 'mixed',
      headline: 'Dollar firm into the data, gold pinned in range',
      summary:
        'Rate expectations are doing the heavy lifting today. Majors are rangebound ahead of the US print, and gold is holding a tight consolidation.',
      majorPairs: [
        { pair: 'EURUSD', bias: 'neutral', note: 'Range between 1.0870 and 1.0960' },
        { pair: 'GBPUSD', bias: 'bearish', note: 'Lower highs on H4' },
        { pair: 'XAUUSD', bias: 'neutral', note: 'Waiting on real yields' },
      ],
      events: [
        { time: '13:30', title: 'US CPI (m/m)', impact: 'high' },
        { time: '15:00', title: 'US consumer sentiment', impact: 'medium' },
      ],
      keyLevels: [
        { pair: 'EURUSD', support: '1.0868', resistance: '1.0962' },
        { pair: 'XAUUSD', support: '2394', resistance: '2437' },
      ],
      focus: 'Let the CPI print settle before taking a directional position on the dollar.',
      isPremium: false,
      publishedAt: now(),
    },
    { merge: true },
  );
  console.log(`✓ daily brief (${day})`);
}

async function promoteAdmin(): Promise<{ uid: string; name: string } | null> {
  const email = process.env.ADMIN_EMAIL;
  if (!email) {
    console.warn('! ADMIN_EMAIL not set — skipping admin promotion.');
    return null;
  }

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, {
      admin: true,
      moderator: true,
      plan: 'premium',
      community: 'approved',
      status: 'active',
    });
    await auth.revokeRefreshTokens(user.uid);

    await db.collection('users').doc(user.uid).set(
      {
        role: 'admin',
        plan: 'premium',
        status: 'active',
        community: { status: 'approved', joinedAt: now() },
        updatedAt: now(),
      },
      { merge: true },
    );

    const snap = await db.collection('users').doc(user.uid).get();
    const name = (snap.get('fullName') as string) ?? user.displayName ?? 'Admin';

    await db.collection('community_members').doc(user.uid).set(
      {
        uid: user.uid,
        displayName: name,
        username: snap.get('username') ?? '',
        photoURL: snap.get('photoURL') ?? '',
        role: 'admin',
        plan: 'premium',
        status: 'approved',
        joinedAt: now(),
      },
      { merge: true },
    );

    console.log(`✓ ${email} promoted to admin (uid ${user.uid})`);
    return { uid: user.uid, name };
  } catch (err) {
    console.error(`! could not promote ${email}:`, (err as Error).message);
    console.error('  Register the account in the app first, then re-run this script.');
    return null;
  }
}

async function main() {
  console.log(`Seeding project ${projectId}…\n`);

  const adminUser = await promoteAdmin();
  const authorId = adminUser?.uid ?? 'system';
  const authorName = adminUser?.name ?? 'Forex Trade Hub Desk';

  await seedSettings();
  await seedCommunity();
  await seedQuotes();
  await seedSignals(authorId, authorName);
  await seedNews();
  await seedCourse();
  await seedPoll(authorId);
  await seedBrief();

  console.log('\nDone. Open the app — the dashboard should be fully populated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
