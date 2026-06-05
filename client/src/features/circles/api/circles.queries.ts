'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch, buildQueryParams } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type {
  ActiveCirclesData,
  ListCircleCategoriesData,
} from '../types/circles-api.types';

const { CIRCLES } = API_ENDPOINTS;

export type ListActiveCirclesArgs = {
  cursor?: string;
  limit?: number;
};

async function fetchActiveCircles(
  args: ListActiveCirclesArgs = {},
): Promise<ActiveCirclesData> {
  const qs = buildQueryParams({
    cursor: args.cursor,
    limit: args.limit,
  });
  const path = qs ? `${CIRCLES.ACTIVE}?${qs}` : CIRCLES.ACTIVE;
  const data = await apiFetch<ActiveCirclesData | null | undefined>(path);
  if (!data) {
    throw new Error('Active circles response missing data');
  }
  return data;
}

export function useListCircleCategories(enabled = true) {
  return useQuery({
    queryKey: queryKeys.circles.categories,
    queryFn: () => apiFetch<ListCircleCategoriesData>(CIRCLES.CATEGORIES),
    enabled,
    refetchOnMount: true,
  });
}

export function useListActiveCircles(args: ListActiveCirclesArgs = {}) {
  return useQuery({
    queryKey: queryKeys.circles.active(args),
    queryFn: () => fetchActiveCircles(args),
    refetchOnMount: true,
  });
}

/** Paginated public discover list; invited/joined come from the first page only. */
export function useBrowseActiveCircles(options: { limit?: number } = {}) {
  const limit = options.limit ?? 12;

  return useInfiniteQuery({
    queryKey: queryKeys.circles.browseInfinite(limit),
    queryFn: ({ pageParam }) =>
      fetchActiveCircles({ cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.public.hasMore && lastPage.public.nextCursor
        ? lastPage.public.nextCursor
        : undefined,
    refetchOnMount: true,
  });
}
