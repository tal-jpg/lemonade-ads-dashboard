import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit as fbLimit,
  where,
  type QueryConstraint,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Live collection subscription with a mapper.
 *
 * Constraints are compared by their serialised form so passing an inline array
 * does not resubscribe on every render — the mistake that turns an admin table
 * into a runaway read bill.
 */
export function useCollection<T>(
  path: string,
  mapper: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  constraints: QueryConstraint[] = [],
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const key = useMemo(() => JSON.stringify(deps), deps);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      query(collection(db, path), ...constraints),
      (snap) => {
        setData(snap.docs.map(mapper));
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === 'permission-denied'
            ? 'You do not have permission to read this collection.'
            : err.message,
        );
        setLoading(false);
      },
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);

  return { data, loading, error };
}

export { orderBy, fbLimit as limit, where };
