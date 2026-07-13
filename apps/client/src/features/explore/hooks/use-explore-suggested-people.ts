"use client";

import { useMemo } from "react";

import { EXPLORE } from "@/lib/copy/user-messages";

import { useSuggestedPeople } from "../api/suggested-people.queries";
import type { SuggestedPersonItem } from "../types/suggested-people.types";

import { useExploreSuggestedPeopleScroll } from "./use-explore-suggested-people-scroll";

function dedupePeople(items: SuggestedPersonItem[]): SuggestedPersonItem[] {
  const seenUserIds = new Set<string>();
  const merged: SuggestedPersonItem[] = [];

  for (const item of items) {
    if (seenUserIds.has(item.userId)) continue;
    seenUserIds.add(item.userId);
    merged.push(item);
  }

  return merged;
}

export function useExploreSuggestedPeople() {
  const { data, isLoading, isError, isFetching } = useSuggestedPeople({
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const allPeople = useMemo(
    () => dedupePeople(data?.items ?? []),
    [data?.items],
  );

  const scrollResetKey =
    allPeople.length > 0
      ? `${allPeople.length}:${allPeople[0]?.userId ?? ""}`
      : "empty";

  const { visibleCount, hasMore, loadMoreSentinelRef } = useExploreSuggestedPeopleScroll({
    totalCount: allPeople.length,
    resetKey: scrollResetKey,
    enabled: !isLoading && allPeople.length > 0,
  });

  const suggestedPeople = useMemo(
    () => allPeople.slice(0, visibleCount),
    [allPeople, visibleCount],
  );

  const hasUserInterests = data?.hasInterests ?? false;
  const hasLoadedData = data !== undefined;
  const serverHasMore = data?.hasMore ?? false;

  const sectionSubtitle = hasUserInterests
    ? EXPLORE.peopleLikeYou.subtitleWithInterests
    : EXPLORE.peopleLikeYou.subtitleNoInterests;

  const showEmptyNoMatches =
    hasLoadedData &&
    !isError &&
    !isLoading &&
    !isFetching &&
    hasUserInterests &&
    allPeople.length === 0;

  return {
    suggestedPeople,
    sectionSubtitle,
    showEmptyNoMatches,
    hasUserInterests,
    hasLoadedData,
    serverHasMore,
    isLoading: isLoading && !hasLoadedData,
    isError,
    canLoadMore: hasMore,
    loadMoreSentinelRef,
  };
}
