"use client";

import { useMemo } from "react";

import { useBrowseActiveSpaces } from "../api/spaces.queries";
import { SPACES_BROWSE_PAGE_SIZE } from "../constants/spaces-browse-copy";
import { parseBrowseSpacePages } from "../lib/parse-browse-space-pages";

type BrowseQueryOptions = {
  pageSize?: number;
};

/**
 * Loads invited, joined, and paginated public circles for `/spaces`.
 */
export function useSpacesBrowseData(options: BrowseQueryOptions = {}) {
  const pageSize = options.pageSize ?? SPACES_BROWSE_PAGE_SIZE;

  const query = useBrowseActiveSpaces({ limit: pageSize });

  const { friendInvited, joined, discoverItems } = useMemo(
    () => parseBrowseSpacePages(query.data?.pages),
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
