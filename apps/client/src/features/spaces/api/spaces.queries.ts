'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch, buildQueryParams } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type {
  ActiveSpacesData,
  ListSpaceActivityOptionsData,
  ListSpaceCategoriesData,
} from '../types/spaces-api.types';

const { SPACES } = API_ENDPOINTS;

export type ListActiveSpacesArgs = {
  cursor?: string;
  limit?: number;
};

async function fetchActiveSpaces(
  args: ListActiveSpacesArgs = {},
): Promise<ActiveSpacesData> {
  const qs = buildQueryParams({
    cursor: args.cursor,
    limit: args.limit,
  });
  const path = qs ? `${SPACES.ACTIVE}?${qs}` : SPACES.ACTIVE;
  const data = await apiFetch<ActiveSpacesData | null | undefined>(path);
  if (!data) {
    throw new Error('Active spaces response missing data');
  }
  return data;
}

export function useListSpaceCategories(enabled = true) {
  return useQuery({
    queryKey: queryKeys.spaces.categories,
    queryFn: () => apiFetch<ListSpaceCategoriesData>(SPACES.CATEGORIES),
    enabled,
    refetchOnMount: true,
  });
}

export function useListSpaceActivityOptions(enabled = true) {
  return useQuery({
    queryKey: queryKeys.spaces.activityOptions,
    queryFn: () => apiFetch<ListSpaceActivityOptionsData>(SPACES.ACTIVITY_OPTIONS),
    enabled,
    refetchOnMount: true,
  });
}

export function useListActiveSpaces(
  args: ListActiveSpacesArgs = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.spaces.active(args),
    queryFn: () => fetchActiveSpaces(args),
    enabled: options?.enabled ?? true,
    refetchOnMount: true,
  });
}

/** Paginated public discover list; invited/joined come from the first page only. */
export function useBrowseActiveSpaces(options: { limit?: number } = {}) {
  const limit = options.limit ?? 12;

  return useInfiniteQuery({
    queryKey: queryKeys.spaces.browseInfinite(limit),
    queryFn: ({ pageParam }) =>
      fetchActiveSpaces({ cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.public.hasMore && lastPage.public.nextCursor
        ? lastPage.public.nextCursor
        : undefined,
    refetchOnMount: true,
  });
}
