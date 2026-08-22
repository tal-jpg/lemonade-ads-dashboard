import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CommunityInfo,
  CommunityMember,
  JoinRequest,
  Message,
  Poll,
} from '../types/models';
import {
  observeCommunity,
  observeRecentMessages,
  fetchOlderMessages,
  observeMembers,
  observeMyJoinRequest,
  sendMessage as sendMessageRepo,
  deleteMessage as deleteMessageRepo,
  editMessage as editMessageRepo,
  toggleReaction as toggleReactionRepo,
  setPinned as setPinnedRepo,
  stampLastRead,
  type MessageCursor,
  type SendMessageInput,
} from '../services/firebase/communityRepo';
import { observeActivePoll, observeMyVote } from '../services/firebase/pollRepo';
import { castVote, requestJoinCommunity } from '../services/firebase/callables';
import { useAuthStore, useCanPostInCommunity } from '../store/authStore';
import { toAppError } from '../utils/errors';
import { toast } from '../store/uiStore';
import { track } from '../services/analytics';

/**
 * Community state.
 *
 * The chat keeps a live subscription on the newest page only and appends older
 * pages on demand, so opening the room costs one small query no matter how big
 * the history is.
 */

export function useCommunityInfo() {
  const [info, setInfo] = useState<CommunityInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeCommunity((next) => {
      setInfo(next);
      setLoading(false);
    });
  }, []);

  return { info, loading };
}

export function useMessages() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const [live, setLive] = useState<Message[]>([]);
  const [history, setHistory] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<MessageCursor>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = observeRecentMessages(
      (messages, cursor) => {
        setLive(messages);
        // Only adopt the live cursor before any history has been paged in;
        // afterwards the history cursor is the older boundary.
        if (!history.length) cursorRef.current = cursor;
        setLoading(false);
      },
      (err) => {
        setError(toAppError(err).message);
        setLoading(false);
      },
    );
    return unsubscribe;
    // `history.length` is read but must not re-subscribe the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (uid && !loading) void stampLastRead(uid);
  }, [uid, loading, live.length]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore || !cursorRef.current) return;
    setLoadingMore(true);
    try {
      const page = await fetchOlderMessages(cursorRef.current);
      cursorRef.current = page.cursor;
      setHistory((prev) => [...prev, ...page.messages]);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(toAppError(err).message);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  /** Newest first — the chat list is inverted. */
  const messages = useMemo(() => {
    const seen = new Set(live.map((m) => m.id));
    return [...live, ...history.filter((m) => !seen.has(m.id))];
  }, [live, history]);

  const pinned = useMemo(() => messages.find((m) => m.pinned && !m.deleted) ?? null, [messages]);

  return { messages, pinned, loading, loadingMore, hasMore, error, loadOlder };
}

export function useMessageActions() {
  const profile = useAuthStore((s) => s.profile);
  const canPost = useCanPostInCommunity();
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async (input: Omit<SendMessageInput, 'author'>) => {
      if (!profile || !canPost) {
        toast.error('You do not have permission to post here.');
        return false;
      }
      setSending(true);
      try {
        await sendMessageRepo({ ...input, author: profile });
        void track({ name: 'message_sent', params: { type: input.type } });
        return true;
      } catch (err) {
        toast.error(toAppError(err).message);
        return false;
      } finally {
        setSending(false);
      }
    },
    [canPost, profile],
  );

  const remove = useCallback(
    async (messageId: string) => {
      if (!profile) return;
      try {
        await deleteMessageRepo(messageId, profile.uid);
      } catch (err) {
        toast.error(toAppError(err).message);
      }
    },
    [profile],
  );

  const edit = useCallback(async (messageId: string, text: string) => {
    try {
      await editMessageRepo(messageId, text);
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  }, []);

  const react = useCallback(
    async (message: Message, emoji: string) => {
      if (!profile) return;
      const already = (message.reactions[emoji] ?? []).includes(profile.uid);
      try {
        await toggleReactionRepo(message.id, emoji, profile.uid, !already);
      } catch (err) {
        toast.error(toAppError(err).message);
      }
    },
    [profile],
  );

  const pin = useCallback(async (messageId: string, pinned: boolean) => {
    try {
      await setPinnedRepo(messageId, pinned);
      toast.success(pinned ? 'Message pinned' : 'Message unpinned');
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  }, []);

  return { send, remove, edit, react, pin, sending };
}

export function useMembers() {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeMembers((next) => {
      setMembers(next);
      setLoading(false);
    });
  }, []);

  const online = useMemo(
    () => members.filter((m) => (m.lastSeenAt ?? 0) > Date.now() - 5 * 60_000).length,
    [members],
  );

  return { members, online, loading };
}

/**
 * Membership gate.
 *
 * Users request access and staff decide; there is deliberately no self-service
 * "leave community" action — removal is an administrative act.
 */
export function useJoinRequest() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const refreshClaims = useAuthStore((s) => s.refreshClaims);
  const [request, setRequest] = useState<JoinRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return observeMyJoinRequest(uid, (next) => {
      setRequest(next);
      // An approval changes the community claim; refresh so the chat unlocks
      // without requiring a sign-out.
      if (next?.status === 'approved') void refreshClaims();
    });
  }, [refreshClaims, uid]);

  const submit = useCallback(async (message?: string) => {
    setSubmitting(true);
    try {
      await requestJoinCommunity({ message });
      void track({ name: 'community_join_requested' });
      toast.success('Request sent. An admin will review it shortly.');
      return true;
    } catch (err) {
      toast.error(toAppError(err).message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { request, submit, submitting };
}

// --------------------------------------------------------------------- polls

export function useActivePoll() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [myVote, setMyVote] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    return observeActivePoll((next) => {
      setPoll(next);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!poll || !uid) {
      setMyVote(null);
      return;
    }
    return observeMyVote(poll.id, uid, setMyVote);
  }, [poll, uid]);

  const vote = useCallback(
    async (optionIds: string[]) => {
      if (!poll || voting) return;
      setVoting(true);
      // Optimistic: reveal results immediately, the listener corrects the
      // tallies a moment later.
      setMyVote(optionIds);
      try {
        await castVote({ pollId: poll.id, optionIds });
        void track({ name: 'poll_voted', params: { poll_id: poll.id } });
      } catch (err) {
        setMyVote(null);
        toast.error(toAppError(err).message);
      } finally {
        setVoting(false);
      }
    },
    [poll, voting],
  );

  return { poll, myVote, hasVoted: myVote !== null, loading, voting, vote };
}
