"use client";

import { useMemo } from "react";

import { useBrowseActiveCircles } from "../api/circles.queries";
import { CIRCLES_BROWSE_PAGE_SIZE } from "../constants/circles-browse-copy";
import { parseBrowseCirclePages } from "../lib/parse-browse-circle-pages";

type BrowseQueryOptions = {
  pageSize?: number;
};

/**
 * Loads invited, joined, and paginated public circles for `/circles`.
 */
export function useCirclesBrowseData(options: BrowseQueryOptions = {}) {
  const pageSize = options.pageSize ?? CIRCLES_BROWSE_PAGE_SIZE;

  const query = useBrowseActiveCircles({ limit: pageSize });

  const { friendInvited, joined, discoverItems } = useMemo(
    () => parseBrowseCirclePages(query.data?.pages),
    [query.data?.pages],
  );

  const isEmpty =
    !query.isLoading &&
    friendInvited.length === 0 &&
    joined.length === 0 &&
    discoverItems.length === 0;

  const isRefreshing =
    query.isFetching && !query.isLoading && !query.isFetchingNextPage;

  return {
    friendInvited,
    joined,
    discoverItems,
    isEmpty,
    isRefreshing,
    hasNextPage: query.hasNextPage,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasLoadedOnce: Boolean(query.data),
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
  };
}
