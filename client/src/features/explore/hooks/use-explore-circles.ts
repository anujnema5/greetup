"use client";

import { useMemo } from "react";

import { useListActiveCircles } from "@/features/circles/api/circles.queries";
import { dedupeCircles } from "@/features/circles/lib/dedupe-circles";
import { activeCircleCardShowsLiveSession } from "@/features/circles/lib/active-circle-card-session-display";
import type { ActiveCircleItem } from "@/features/circles/types/circles-api.types";

import type { ExploreFilter } from "../types/explore-filter.types";

const TRENDING_LIMIT = 2;
const POPULAR_LIMIT = 6;

function sortByPopularity(a: ActiveCircleItem, b: ActiveCircleItem): number {
  const liveA = activeCircleCardShowsLiveSession(a) ? 1 : 0;
  const liveB = activeCircleCardShowsLiveSession(b) ? 1 : 0;
  if (liveB !== liveA) return liveB - liveA;
  return b.participantCount - a.participantCount;
}

function filterCircles(
  circles: readonly ActiveCircleItem[],
  filter: ExploreFilter,
): ActiveCircleItem[] {
  if (filter === "for-you") return [...circles];
  if (filter === "live-now") {
    return circles.filter((c) => activeCircleCardShowsLiveSession(c));
  }
  return circles.filter((c) => c.category.id === filter.nicheId);
}

export function useExploreCircles(filter: ExploreFilter) {
  const { data, isLoading, isError, error, isFetching } = useListActiveCircles();

  const allCircles = useMemo(() => {
    if (!data) return [];
    return dedupeCircles([...data.friendInvited, ...data.joined, ...data.public.items]);
  }, [data]);

  const filtered = useMemo(
    () => filterCircles(allCircles, filter).sort(sortByPopularity),
    [allCircles, filter],
  );

  const trending = useMemo(() => {
    const live = filtered.filter((c) => activeCircleCardShowsLiveSession(c));
    return live.slice(0, TRENDING_LIMIT);
  }, [filtered]);

  const trendingIds = useMemo(() => new Set(trending.map((c) => c.id)), [trending]);

  const popular = useMemo(
    () => filtered.filter((c) => !trendingIds.has(c.id)).slice(0, POPULAR_LIMIT),
    [filtered, trendingIds],
  );

  return {
    allCircles,
    filtered,
    trending,
    popular,
    isLoading,
    isError,
    error,
    isFetching,
    hasAny: filtered.length > 0,
  };
}
