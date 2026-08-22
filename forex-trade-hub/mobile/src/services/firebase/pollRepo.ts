import {
  onSnapshot,
  getDoc,
  query,
  where,
  orderBy,
  limit,
} from '@react-native-firebase/firestore';
import { refs } from './paths';
import { mapPoll } from './mappers';
import type { Poll } from '../../types/models';
import { DEMO_MODE } from '../../config/demo';
import * as demo from '../demo/repos';

/**
 * Polls.
 *
 * Votes are cast through the `castVote` callable, never written directly: the
 * function is what keeps the per-option tallies consistent and enforces
 * one-vote-per-user. This repository is read-only by design.
 */

export function observeActivePoll(
  onData: (poll: Poll | null) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeActivePoll(onData);
  const q = query(
    refs.polls(),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limit(1),
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.length ? mapPoll(snap.docs[0]) : null),
    (err) => onError?.(err),
  );
}

export function observePolls(
  count: number,
  onData: (polls: Poll[]) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observePolls(count, onData);
  const q = query(refs.polls(), orderBy('createdAt', 'desc'), limit(count));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(mapPoll).filter((p): p is Poll => p !== null)),
    (err) => onError?.(err),
  );
}

/** The caller's own vote, used to lock the poll and reveal results. */
export async function fetchMyVote(pollId: string, uid: string): Promise<string[] | null> {
  if (DEMO_MODE) return demo.fetchMyVote();
  try {
    const snap = await getDoc(refs.pollVote(pollId, uid));
    const data = snap.data();
    if (!data) return null;
    return Array.isArray(data.optionIds) ? (data.optionIds as string[]) : null;
  } catch {
    return null;
  }
}

export function observeMyVote(
  pollId: string,
  uid: string,
  onData: (optionIds: string[] | null) => void,
) {
  if (DEMO_MODE) return demo.observeMyVote(pollId, uid, onData);
  return onSnapshot(
    refs.pollVote(pollId, uid),
    (snap) => {
      const data = snap.data();
      onData(data && Array.isArray(data.optionIds) ? (data.optionIds as string[]) : null);
    },
    () => onData(null),
  );
}

/** Percentage of total votes for an option, guarded against divide-by-zero. */
export function optionPct(votes: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((votes / total) * 100);
}
