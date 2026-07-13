"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export const RECENT_MATCHES_PAGE_SIZE = 12;

/** Simulated fetch delay so the load-more spinner is visible during client-side paging. */
const LOAD_MORE_DELAY_MS = 350;

type UseRecentMatchesScrollPaginationArgs = {
  /** Full list length (after filters). */
  totalCount: number;
  /** Reset paging when the dialog opens or the list identity changes. */
  resetKey: string | number;
  enabled?: boolean;
  /** Scrollable container — observer root for in-dialog infinite scroll. */
  scrollRootRef?: RefObject<HTMLElement | null>;
};

export function useRecentMatchesScrollPagination({
  totalCount,
  resetKey,
  enabled = true,
  scrollRootRef,
}: UseRecentMatchesScrollPaginationArgs) {
  const [visibleCount, setVisibleCount] = useState(RECENT_MATCHES_PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(RECENT_MATCHES_PAGE_SIZE);
    setIsLoadingMore(false);
  }, [resetKey]);

  const hasMore = visibleCount < totalCount;

  const loadMore = useCallback(() => {
    if (!enabled || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    window.setTimeout(() => {
      setVisibleCount((current) => Math.min(current + RECENT_MATCHES_PAGE_SIZE, totalCount));
      setIsLoadingMore(false);
    }, LOAD_MORE_DELAY_MS);
  }, [enabled, hasMore, isLoadingMore, totalCount]);

  useEffect(() => {
    if (!enabled || !hasMore || isLoadingMore) return;

    const el = loadMoreSentinelRef.current;
    if (!el) return;

    const root = scrollRootRef?.current ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, rootMargin: "80px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, hasMore, isLoadingMore, loadMore, scrollRootRef, visibleCount]);

  return {
    visibleCount,
    hasMore,
    isLoadingMore,
    loadMoreSentinelRef,
  };
}
