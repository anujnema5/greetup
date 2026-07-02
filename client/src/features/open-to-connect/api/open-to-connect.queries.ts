"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { API_ENDPOINTS, apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query/keys";

import { OPEN_NOW_BROWSE_PAGE_SIZE } from "../constants/open-now.constants";
import type { OpenNowFeedData, OpenToConnectMe } from "../types/open-to-connect.types";

const OPEN_NOW_REFETCH_MS = 30_000;
const OPEN_ME_REFETCH_MS = 45_000;

async function fetchOpenToConnectMe(): Promise<OpenToConnectMe> {
  const data = await apiFetch<OpenToConnectMe | null | undefined>(API_ENDPOINTS.OPEN_TO_CONNECT.ME);
  return (
    data ?? {
      openToConnect: false,
      pausedForRoom: false,
      source: null,
      headline: null,
      updatedAt: null,
      activityIds: [],
      moodIds: [],
      interestIds: [],
      visibleInDiscovery: false,
    }
  );
}

type FeedQueryArgs = {
  activityId?: string;
  interestId?: string;
  enabled?: boolean;
};

type FeedPageArgs = FeedQueryArgs & {
  cursor?: string;
  limit?: number;
};

function buildOpenNowFeedPath(args: FeedPageArgs): string {
  const params = new URLSearchParams();
  if (args.activityId) params.set("activityId", args.activityId);
  if (args.interestId) params.set("interestId", args.interestId);
  if (args.cursor) params.set("cursor", args.cursor);
  if (args.limit != null) params.set("limit", String(args.limit));
  const qs = params.toString();
  return qs ? `${API_ENDPOINTS.OPEN_TO_CONNECT.FEED}?${qs}` : API_ENDPOINTS.OPEN_TO_CONNECT.FEED;
}

async function fetchOpenNowFeedPage(args: FeedPageArgs): Promise<OpenNowFeedData> {
  const data = await apiFetch<OpenNowFeedData | null | undefined>(buildOpenNowFeedPath(args));
  return data ?? { items: [], nextCursor: null, limit: args.limit ?? OPEN_NOW_BROWSE_PAGE_SIZE };
}

async function fetchOpenNowFeed(args: FeedQueryArgs): Promise<OpenNowFeedData> {
  return fetchOpenNowFeedPage(args);
}

async function fetchOpenNowSidebar(args: FeedQueryArgs): Promise<OpenNowFeedData> {
  const params = new URLSearchParams();
  if (args.activityId) params.set("activityId", args.activityId);
  if (args.interestId) params.set("interestId", args.interestId);
  const qs = params.toString();
  const path = qs
    ? `${API_ENDPOINTS.OPEN_TO_CONNECT.SIDEBAR}?${qs}`
    : API_ENDPOINTS.OPEN_TO_CONNECT.SIDEBAR;
  const data = await apiFetch<OpenNowFeedData | null | undefined>(path);
  return data ?? { items: [], nextCursor: null, limit: 8 };
}

export function useOpenNowFeed(args: FeedQueryArgs = {}) {
  const { activityId, interestId, enabled = true } = args;
  return useQuery({
    queryKey: queryKeys.openToConnect.feed({ activityId, interestId }),
    queryFn: () => fetchOpenNowFeed({ activityId, interestId }),
    enabled,
    refetchInterval: OPEN_NOW_REFETCH_MS,
    refetchOnMount: true,
  });
}

export function useOpenNowFeedInfinite(args: FeedQueryArgs = {}) {
  const { activityId, interestId, enabled = true } = args;
  return useInfiniteQuery({
    queryKey: queryKeys.openToConnect.feedInfinite({ activityId, interestId }),
    queryFn: ({ pageParam }) =>
      fetchOpenNowFeedPage({
        activityId,
        interestId,
        cursor: pageParam,
        limit: OPEN_NOW_BROWSE_PAGE_SIZE,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled,
    refetchInterval: OPEN_NOW_REFETCH_MS,
    refetchOnMount: true,
  });
}

export function useOpenNowSidebar(args: FeedQueryArgs = {}) {
  const { activityId, interestId, enabled = true } = args;
  return useQuery({
    queryKey: queryKeys.openToConnect.sidebar({ activityId, interestId }),
    queryFn: () => fetchOpenNowSidebar({ activityId, interestId }),
    enabled,
    refetchInterval: OPEN_NOW_REFETCH_MS,
    refetchOnMount: true,
  });
}

export function useOpenToConnectMe(enabled = true) {
  return useQuery({
    queryKey: queryKeys.openToConnect.me,
    queryFn: fetchOpenToConnectMe,
    enabled,
    refetchInterval: (query) =>
      query.state.data?.openToConnect ? OPEN_ME_REFETCH_MS : false,
    refetchOnWindowFocus: true,
  });
}

async function fetchOpenToConnectSearchSuggestions(): Promise<OpenNowFeedData> {
  const data = await apiFetch<OpenNowFeedData | null | undefined>(
    API_ENDPOINTS.OPEN_TO_CONNECT.SUGGESTIONS_FOR_SEARCH,
  );
  return data ?? { items: [], nextCursor: null, limit: 5 };
}

export function useOpenToConnectSearchSuggestions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.openToConnect.searchSuggestions,
    queryFn: fetchOpenToConnectSearchSuggestions,
    enabled,
    refetchInterval: enabled ? OPEN_NOW_REFETCH_MS : false,
    retry: false,
    refetchOnMount: true,
  });
}
