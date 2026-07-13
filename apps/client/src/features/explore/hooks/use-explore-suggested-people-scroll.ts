"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { SUGGESTED_PEOPLE_PAGE_SIZE } from "../constants/suggested-people";

type Args = {
  totalCount: number;
  resetKey: string | number;
  enabled?: boolean;
};

export function useExploreSuggestedPeopleScroll({
  totalCount,
  resetKey,
  enabled = true,
}: Args) {
  const [visibleCount, setVisibleCount] = useState(SUGGESTED_PEOPLE_PAGE_SIZE);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreLockedRef = useRef(false);

  useEffect(() => {
    setVisibleCount(SUGGESTED_PEOPLE_PAGE_SIZE);
    loadMoreLockedRef.current = false;
  }, [resetKey]);

  const hasMore = visibleCount < totalCount;

  const loadMore = useCallback(() => {
    if (!enabled || !hasMore || loadMoreLockedRef.current) return;
    loadMoreLockedRef.current = true;
    setVisibleCount((current) =>
      Math.min(current + SUGGESTED_PEOPLE_PAGE_SIZE, totalCount),
    );
    loadMoreLockedRef.current = false;
  }, [enabled, hasMore, totalCount]);

  useEffect(() => {
    if (!enabled || !hasMore) return;

    const el = loadMoreSentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "80px", threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, hasMore, loadMore, visibleCount]);

  return {
    visibleCount,
    hasMore,
    loadMoreSentinelRef,
  };
}
