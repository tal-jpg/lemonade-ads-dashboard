/** Small shared hooks for the SPA: page data fetching, document metadata, JSON-LD. */
import { useEffect, useState } from "react";
import { ApiError } from "./client";

interface DataState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/**
 * Fetch page data on mount (and whenever deps change). Concurrent-safe: a
 * stale response never overwrites a newer one.
 */
export function useData<T>(load: () => Promise<T>, deps: unknown[]): DataState<T> & { notFound: boolean } {
  const [state, setState] = useState<DataState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    let alive = true;
    setState({ data: null, error: null, loading: true });
    load().then(
      (data) => { if (alive) setState({ data, error: null, loading: false }); },
      (error: Error) => { if (alive) setState({ data: null, error, loading: false }); },
    );
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, notFound: state.error instanceof ApiError && state.error.status === 404 };
}

/** Set document.title + meta description for the current page. */
export function usePageMeta(title?: string, description?: string): void {
  useEffect(() => {
    if (title) document.title = title;
    if (description !== undefined) {
      let el = document.querySelector('meta[name="description"]');
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", "description");
        document.head.appendChild(el);
      }
      el.setAttribute("content", description);
    }
  }, [title, description]);
}

/** Render a schema.org JSON-LD block. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
