'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import { SUGGESTED_PEOPLE_FETCH_LIMIT } from '../constants/suggested-people';
import type { SuggestedPeopleData } from '../types/suggested-people.types';

type UseSuggestedPeopleOptions = {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

async function fetchSuggestedPeople(): Promise<SuggestedPeopleData> {
  const params = new URLSearchParams();
  params.set('page', '1');
  params.set('limit', String(SUGGESTED_PEOPLE_FETCH_LIMIT));
  const data = await apiFetch<SuggestedPeopleData | null | undefined>(
    `${API_ENDPOINTS.SEARCH.SUGGESTED_PEOPLE}?${params.toString()}`,
  );
  return (
    data ?? {
      items: [],
      hasInterests: false,
      page: 1,
      limit: SUGGESTED_PEOPLE_FETCH_LIMIT,
      hasMore: false,
    }
  );
}

export function useSuggestedPeople(options?: UseSuggestedPeopleOptions) {
  return useQuery({
    queryKey: queryKeys.explore.suggestedPeople,
    queryFn: fetchSuggestedPeople,
    enabled: options?.enabled ?? true,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
  });
}
