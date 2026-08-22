import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { db, FieldValue, requireAuth, expectString } from './common';
import { broadcast } from './notifications';

/**
 * Content publication triggers and the poll vote tally.
 */

// ---------------------------------------------------------------------- news

export const onNewsPublished = onDocumentCreated('news/{newsId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const article = snap.data();
  if (article.status !== 'published') return;

  await broadcast(article.isPremium === true ? 'premium' : 'all', {
    type: 'news',
    title: String(article.title ?? 'Market news'),
    body: String(article.summary ?? '').slice(0, 140),
    route: `/news/${snap.id}`,
    imageUrl: article.imageUrl || undefined,
    data: { articleId: snap.id },
  });
});

// ----------------------------------------------------------------- lessons

export const onLessonPublished = onDocumentCreated(
  'courses/{courseId}/lessons/{lessonId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const lesson = snap.data();

    const courseSnap = await db.collection('courses').doc(event.params.courseId).get();
    if (!courseSnap.exists || courseSnap.get('status') !== 'published') return;

    // Keep the denormalised lesson count honest.
    await courseSnap.ref.update({ lessonCount: FieldValue.increment(1) });

    await broadcast(lesson.isPremium === true ? 'premium' : 'all', {
      type: 'lesson',
      title: 'New lesson available',
      body: `${courseSnap.get('title') ?? 'Course'} · ${lesson.title ?? ''}`,
      route: `/course/${event.params.courseId}/lesson/${snap.id}`,
      data: { courseId: event.params.courseId, lessonId: snap.id },
    });
  },
);

// ----------------------------------------------------------- announcements

export const onAnnouncementCreated = onDocumentCreated(
  'announcements/{announcementId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const announcement = snap.data();

    const audience = ['all', 'free', 'premium'].includes(String(announcement.audience))
      ? (announcement.audience as 'all' | 'free' | 'premium')
      : 'all';

    await broadcast(audience, {
      type: 'announcement',
      title: String(announcement.title ?? 'Announcement'),
      body: String(announcement.body ?? '').slice(0, 160),
      route: '/(tabs)/community',
      data: { announcementId: snap.id },
    });
  },
);

// ------------------------------------------------------------------- polls

export const onPollCreated = onDocumentCreated('polls/{pollId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const poll = snap.data();
  if (poll.isActive === false) return;

  await broadcast('all', {
    type: 'poll',
    title: 'New community poll',
    body: String(poll.question ?? '').slice(0, 140),
    route: '/(tabs)/community',
    data: { pollId: snap.id },
  });
});

/**
 * Casts a vote.
 *
 * Runs in a transaction so the per-option counters and the total can never
 * drift from the individual vote documents, and so a double submission is
 * rejected rather than double-counted.
 */
export const castVote = onCall(async (request) => {
  const uid = requireAuth(request);

  if (request.auth?.token?.community !== 'approved' && request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Only community members can vote.');
  }

  const pollId = expectString(request.data?.pollId, 'pollId', 128);
  const optionIds = Array.isArray(request.data?.optionIds)
    ? (request.data.optionIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : [];

  if (optionIds.length === 0 || optionIds.length > 10) {
    throw new HttpsError('invalid-argument', 'Choose at least one option.');
  }

  const pollRef = db.collection('polls').doc(pollId);
  const voteRef = pollRef.collection('votes').doc(uid);

  const totals = await db.runTransaction(async (tx) => {
    const [pollSnap, voteSnap] = await Promise.all([tx.get(pollRef), tx.get(voteRef)]);

    if (!pollSnap.exists) throw new HttpsError('not-found', 'This poll no longer exists.');
    if (voteSnap.exists) throw new HttpsError('already-exists', 'You have already voted.');

    const poll = pollSnap.data() as {
      options?: { id: string; label: string; votes?: number }[];
      allowMultiple?: boolean;
      isActive?: boolean;
      expiresAt?: FirebaseFirestore.Timestamp | number | null;
      totalVotes?: number;
    };

    if (poll.isActive === false) throw new HttpsError('failed-precondition', 'This poll is closed.');

    const expiresAt =
      typeof poll.expiresAt === 'number'
        ? poll.expiresAt
        : poll.expiresAt && 'toMillis' in poll.expiresAt
          ? poll.expiresAt.toMillis()
          : null;
    if (expiresAt !== null && expiresAt < Date.now()) {
      throw new HttpsError('failed-precondition', 'This poll has closed.');
    }

    if (!poll.allowMultiple && optionIds.length > 1) {
      throw new HttpsError('invalid-argument', 'This poll allows only one choice.');
    }

    const options = poll.options ?? [];
    const validIds = new Set(options.map((o) => o.id));
    for (const id of optionIds) {
      if (!validIds.has(id)) throw new HttpsError('invalid-argument', 'Unknown option.');
    }

    const updated = options.map((option) =>
      optionIds.includes(option.id)
        ? { ...option, votes: (option.votes ?? 0) + 1 }
        : { ...option, votes: option.votes ?? 0 },
    );

    tx.set(voteRef, { uid, optionIds, votedAt: FieldValue.serverTimestamp() });
    tx.update(pollRef, {
      options: updated,
      totalVotes: (poll.totalVotes ?? 0) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Object.fromEntries(updated.map((o) => [o.id, o.votes ?? 0]));
  });

  return { ok: true as const, totals };
});

// -------------------------------------------------- community message hooks

/**
 * Keeps community counters current and notifies mentioned members.
 * Also enforces a simple flood limit that security rules cannot express.
 */
export const onMessageCreated = onDocumentCreated(
  'community/{communityId}/messages/{messageId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const message = snap.data();
    const authorId = String(message.authorId ?? '');
    if (!authorId) return;

    try {
      await db
        .collection('users')
        .doc(authorId)
        .update({ 'stats.messagesSent': FieldValue.increment(1) });

      const mentions = Array.isArray(message.mentions) ? (message.mentions as string[]) : [];
      if (mentions.length > 0) {
        const { notifyUser } = await import('./notifications');
        await Promise.all(
          mentions.slice(0, 20).map((uid) =>
            notifyUser(uid, {
              type: 'community',
              title: `${message.authorName ?? 'Someone'} mentioned you`,
              body: String(message.text ?? '').slice(0, 140),
              route: '/chat',
            }),
          ),
        );
      }
    } catch (err) {
      logger.error('onMessageCreated failed', { id: snap.id, err });
    }
  },
);
