'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch, buildQueryParams } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type {
  BrowseNicheRoomsData,
  BrowseNicheRoomsQueryArgs,
  BrowseNichesData,
} from '../types/browse-niches.types';

const { CIRCLES } = API_ENDPOINTS;

async function fetchBrowseNiches(): Promise<BrowseNichesData> {
  const data = await apiFetch<BrowseNichesData | null | undefined>(CIRCLES.BROWSE_NICHES);
  return data?.niches ? data : { niches: [] };
}

export async function fetchBrowseNicheRooms(
  args: BrowseNicheRoomsQueryArgs,
): Promise<BrowseNicheRoomsData> {
  const { categoryId, cursor, limit } = args;
  const qs = buildQueryParams({ cursor, limit });
  const base = CIRCLES.browseNicheRooms(categoryId);
  const path = qs ? `${base}?${qs}` : base;
  const data = await apiFetch<BrowseNicheRoomsData | null | undefined>(path);
  return data ?? { items: [], nextCursor: null, hasMore: false };
}

export function useBrowseNiches() {
  return useQuery({
    queryKey: queryKeys.explore.browseNiches,
    queryFn: fetchBrowseNiches,
  });
}

/** Imperative fetch for paginated niche room modals. */
export function useFetchBrowseNicheRooms() {
  const qc = useQueryClient();

  return useCallback(
    (args: BrowseNicheRoomsQueryArgs) => {
      const cursor = args.cursor ?? '';
      const limit = args.limit ?? 20;
      return qc.fetchQuery({
        queryKey: queryKeys.explore.browseNicheRooms(args.categoryId, cursor, limit),
        queryFn: () => fetchBrowseNicheRooms(args),
      });
    },
    [qc],
  );
}
