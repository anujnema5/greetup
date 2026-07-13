"use client";

import { useMemo } from "react";

import { useListActiveSpaces } from "@/features/spaces/api/spaces.queries";
import { dedupeSpaces } from "@/features/spaces/lib/dedupe-spaces";
import { activeSpaceCardShowsLiveSession } from "@/features/spaces/lib/active-space-card-session-display";
import type { ActiveSpaceItem } from "@/features/spaces/types/spaces-api.types";

import type { ExploreFilter } from "../types/explore-filter.types";

const TRENDING_LIMIT = 2;
const POPULAR_LIMIT = 6;

function sortByPopularity(a: ActiveSpaceItem, b: ActiveSpaceItem): number {
  const liveA = activeSpaceCardShowsLiveSession(a) ? 1 : 0;
  const liveB = activeSpaceCardShowsLiveSession(b) ? 1 : 0;
  if (liveB !== liveA) return liveB - liveA;
  return b.participantCount - a.participantCount;
}

function filterSpaces(
  spaces: readonly ActiveSpaceItem[],
  filter: ExploreFilter,
): ActiveSpaceItem[] {
  if (filter === "for-you") return [...spaces];
  if (filter === "live-now") {
    return spaces.filter((s) => activeSpaceCardShowsLiveSession(s));
  }
  return spaces.filter((s) => s.category.id === filter.nicheId);
}

export function useExploreSpaces(filter: ExploreFilter) {
  const { data, isLoading, isError, error, isFetching } = useListActiveSpaces();

  const allSpaces = useMemo(() => {
    if (!data) return [];
    return dedupeSpaces([...data.friendInvited, ...data.joined, ...data.public.items]);
  }, [data]);

  const filtered = useMemo(
    () => filterSpaces(allSpaces, filter).sort(sortByPopularity),
    [allSpaces, filter],
  );

  const trending = useMemo(() => {
    const live = filtered.filter((c) => activeSpaceCardShowsLiveSession(c));
    return live.slice(0, TRENDING_LIMIT);
  }, [filtered]);

  const trendingIds = useMemo(() => new Set(trending.map((c) => c.id)), [trending]);

  const popular = useMemo(
    () => filtered.filter((c) => !trendingIds.has(c.id)).slice(0, POPULAR_LIMIT),
    [filtered, trendingIds],
  );

  return {
    allSpaces,
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
