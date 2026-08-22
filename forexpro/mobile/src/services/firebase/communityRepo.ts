import {
  onSnapshot,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  type QueryDocumentSnapshot,
  type DocumentData,
} from '@react-native-firebase/firestore';
import { refs, MAIN_COMMUNITY_ID } from './paths';
import { mapCommunity, mapMessage, mapMember, mapJoinRequest } from './mappers';
import type {
  AppUser,
  CommunityInfo,
  CommunityMember,
  JoinRequest,
  Message,
  MessageMedia,
  MessageType,
  ReplyPreview,
} from '../../types/models';
import { serviceError } from '../../utils/errors';
import { truncate } from '../../utils/format';
import { DEMO_MODE } from '../../config/demo';
import * as demo from '../demo/repos';

/**
 * Community chat.
 *
 * Messages page backwards from newest so the room opens instantly regardless of
 * history size; older pages load on scroll. Nothing here fetches the whole
 * collection.
 */

export const MESSAGE_PAGE = 30;

export type MessageCursor = QueryDocumentSnapshot<DocumentData> | null;

// ---------------------------------------------------------------- community

export function observeCommunity(
  onData: (info: CommunityInfo | null) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeCommunity(onData);
  return onSnapshot(
    refs.community(),
    (snap) => onData(mapCommunity(snap)),
    (err) => onError?.(err),
  );
}

// ------------------------------------------------------------------ messages

/**
 * Live tail of the room. Only the most recent page is subscribed; older
 * messages arrive through `fetchOlderMessages` and are merged by the hook.
 */
export function observeRecentMessages(
  onData: (messages: Message[], cursor: MessageCursor) => void,
  onError: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeRecentMessages(onData);
  const q = query(refs.messages(), orderBy('createdAt', 'desc'), limit(MESSAGE_PAGE));
  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs.map(mapMessage).filter((m): m is Message => m !== null);
      const cursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
      onData(messages, cursor);
    },
    (err) => onError(err),
  );
}

export async function fetchOlderMessages(
  cursor: MessageCursor,
): Promise<{ messages: Message[]; cursor: MessageCursor; hasMore: boolean }> {
  if (DEMO_MODE) return demo.fetchOlderMessages();
  if (!cursor) return { messages: [], cursor: null, hasMore: false };
  try {
    const q = query(
      refs.messages(),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(MESSAGE_PAGE),
    );
    const snap = await getDocs(q);
    return {
      messages: snap.docs.map(mapMessage).filter((m): m is Message => m !== null),
      cursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : cursor,
      hasMore: snap.docs.length === MESSAGE_PAGE,
    };
  } catch (err) {
    throw serviceError(err, 'Could not load older messages.');
  }
}

export type SendMessageInput = {
  author: AppUser;
  type: MessageType;
  text?: string;
  media?: MessageMedia;
  replyTo?: ReplyPreview;
  mentions?: string[];
  forwarded?: boolean;
};

export async function sendMessage(input: SendMessageInput): Promise<string> {
  if (DEMO_MODE) return demo.sendMessage(input);
  try {
    const doc = await addDoc(refs.messages(), {
      authorId: input.author.uid,
      authorName: input.author.fullName,
      authorPhoto: input.author.photoURL ?? '',
      authorRole: input.author.role,
      authorPlan: input.author.plan,
      type: input.type,
      ...(input.text ? { text: input.text.trim() } : {}),
      ...(input.media ? { media: input.media } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.mentions?.length ? { mentions: input.mentions } : {}),
      ...(input.forwarded ? { forwarded: true } : {}),
      reactions: {},
      pinned: false,
      deleted: false,
      createdAt: serverTimestamp(),
    });
    return doc.id;
  } catch (err) {
    throw serviceError(err, 'Message not sent. Tap to retry.');
  }
}

export async function editMessage(id: string, text: string): Promise<void> {
  if (DEMO_MODE) return demo.editMessage(id, text);
  try {
    await updateDoc(refs.message(id), { text: text.trim(), editedAt: serverTimestamp() });
  } catch (err) {
    throw serviceError(err, 'Could not edit the message.');
  }
}

/**
 * Soft delete — the row stays so replies pointing at it still resolve, and
 * moderators keep an audit trail.
 */
export async function deleteMessage(id: string, byUid: string): Promise<void> {
  if (DEMO_MODE) return demo.deleteMessage(id, byUid);
  try {
    await updateDoc(refs.message(id), {
      deleted: true,
      deletedBy: byUid,
      text: '',
      media: null,
    });
  } catch (err) {
    throw serviceError(err, 'Could not delete the message.');
  }
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
  uid: string,
  add: boolean,
): Promise<void> {
  if (DEMO_MODE) return demo.toggleReaction(messageId, emoji, uid, add);
  try {
    await updateDoc(refs.message(messageId), {
      [`reactions.${emoji}`]: add ? arrayUnion(uid) : arrayRemove(uid),
    });
  } catch (err) {
    throw serviceError(err, 'Could not update the reaction.');
  }
}

/** Pin / unpin. Staff-only — enforced by security rules, not by this call. */
export async function setPinned(messageId: string, pinned: boolean): Promise<void> {
  if (DEMO_MODE) return demo.setPinned(messageId, pinned);
  try {
    await updateDoc(refs.message(messageId), { pinned });
    await updateDoc(refs.community(), {
      pinnedMessageId: pinned ? messageId : '',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    throw serviceError(err, 'Could not pin the message.');
  }
}

export async function fetchMessage(id: string): Promise<Message | null> {
  if (DEMO_MODE) return demo.fetchMessage(id);
  try {
    return mapMessage(await getDoc(refs.message(id)));
  } catch {
    return null;
  }
}

/** Client-side search over the loaded window — Firestore has no text search. */
export function searchLoadedMessages(messages: Message[], term: string): Message[] {
  const t = term.trim().toLowerCase();
  if (!t) return [];
  return messages.filter(
    (m) =>
      !m.deleted &&
      ((m.text ?? '').toLowerCase().includes(t) || m.authorName.toLowerCase().includes(t)),
  );
}

export function replyPreviewFor(message: Message): ReplyPreview {
  const preview =
    message.type === 'text'
      ? truncate(message.text ?? '', 90)
      : message.type === 'image'
        ? 'Photo'
        : message.type === 'video'
          ? 'Video'
          : message.type === 'audio'
            ? 'Voice note'
            : 'Attachment';
  return { id: message.id, authorName: message.authorName, preview };
}

// ------------------------------------------------------------------- members

export function observeMembers(
  onData: (members: CommunityMember[]) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeMembers(onData);
  const q = query(refs.members(), where('status', '==', 'approved'), limit(200));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(mapMember).filter((m): m is CommunityMember => m !== null)),
    (err) => onError?.(err),
  );
}

export async function stampLastRead(uid: string): Promise<void> {
  if (DEMO_MODE) return demo.stampLastRead();
  try {
    await updateDoc(refs.member(uid), { lastReadAt: serverTimestamp() });
  } catch {
    // The read cursor is best-effort.
  }
}

// -------------------------------------------------------------- typing state

export async function setTyping(uid: string, name: string, typing: boolean): Promise<void> {
  if (DEMO_MODE) return demo.setTyping();
  try {
    if (typing) {
      await setDoc(refs.typing(uid), { name, at: serverTimestamp() });
    } else {
      await deleteDoc(refs.typing(uid));
    }
  } catch {
    // Presence is decorative.
  }
}

// ------------------------------------------------------------ join requests

export function observeMyJoinRequest(
  uid: string,
  onData: (req: JoinRequest | null) => void,
  onError?: (err: unknown) => void,
) {
  if (DEMO_MODE) return demo.observeMyJoinRequest(uid, onData);
  return onSnapshot(
    refs.joinRequest(uid),
    (snap) => onData(mapJoinRequest(snap)),
    (err) => onError?.(err),
  );
}

export { MAIN_COMMUNITY_ID };
