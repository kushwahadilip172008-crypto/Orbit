import { useCallback, useEffect, useRef, useState } from "react";

interface InfiniteResult<T> {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  prepend: (item: T) => void;
  mutate: (updater: (items: T[]) => T[]) => void;
}

export function useInfiniteQuery<T>(
  fetcher: (cursor?: string) => Promise<{ items: T[]; nextCursor: string | null }>,
  deps: unknown[] = [],
): InfiniteResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cursorRef = useRef<string | null>(null);
  const fetchingRef = useRef(false);

  const load = useCallback(
    async (reset: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        if (reset) {
          setLoading(true);
          cursorRef.current = null;
        } else {
          setLoadingMore(true);
        }
        const cursor = reset ? undefined : cursorRef.current ?? undefined;
        const { items: newItems, nextCursor } = await fetcher(cursor);
        cursorRef.current = nextCursor;
        setError(null);
        setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        fetchingRef.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = useCallback(() => {
    if (!cursorRef.current || fetchingRef.current) return Promise.resolve();
    return load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  const prepend = useCallback((item: T) => setItems((p) => [item, ...p]), []);
  const mutate = useCallback((updater: (items: T[]) => T[]) => setItems(updater), []);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore: !!cursorRef.current,
    loadMore,
    refresh,
    prepend,
    mutate,
  };
}
