import { useCallback, useEffect, useState } from 'react';
import type { Announcement, AppNotification } from '../types/models';
import {
  observeNotifications,
  observeUnreadCount,
  observeAnnouncements,
  markRead,
  markAllRead,
  deleteNotification,
} from '../services/firebase/notificationRepo';
import { useAuthStore, useIsPremium } from '../store/authStore';
import { toAppError } from '../utils/errors';
import { toast } from '../store/uiStore';

export function useNotifications(count = 50) {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return observeNotifications(
      uid,
      count,
      (next) => {
        setItems(next);
        setLoading(false);
      },
      (err) => {
        setError(toAppError(err).message);
        setLoading(false);
      },
    );
  }, [count, uid]);

  const read = useCallback(
    async (id: string) => {
      if (!uid) return;
      try {
        await markRead(uid, id);
      } catch {
        // A failed read-receipt is not worth interrupting the user.
      }
    },
    [uid],
  );

  const readAll = useCallback(async () => {
    if (!uid) return;
    try {
      await markAllRead(uid);
      toast.success("You're all caught up");
    } catch (err) {
      toast.error(toAppError(err).message);
    }
  }, [uid]);

  const remove = useCallback(
    async (id: string) => {
      if (!uid) return;
      try {
        await deleteNotification(uid, id);
      } catch (err) {
        toast.error(toAppError(err).message);
      }
    },
    [uid],
  );

  return { items, loading, error, read, readAll, remove };
}

export function useUnreadCount(): number {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      return;
    }
    return observeUnreadCount(uid, setCount);
  }, [uid]);

  return count;
}

export function useAnnouncements(count = 5) {
  const isPremium = useIsPremium();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return observeAnnouncements(isPremium ? 'premium' : 'free', count, (next) => {
      setItems(next);
      setLoading(false);
    });
  }, [count, isPremium]);

  return { items, pinned: items.find((a) => a.pinned) ?? null, loading };
}
