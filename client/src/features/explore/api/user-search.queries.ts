'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type { SearchUsersData } from '../types/user-search.types';

type UseSearchUsersOptions = {
  enabled?: boolean;
};

async function fetchSearchUsers(q: string, limit: number): Promise<SearchUsersData> {
  const params = new URLSearchParams();
  params.set('q', q.trim());
  params.set('limit', String(limit));
  const data = await apiFetch<SearchUsersData | null | undefined>(
    `${API_ENDPOINTS.SEARCH.USERS}?${params.toString()}`,
  );
  return data?.items ? data : { items: [] };
}

export function useSearchUsers(
  { q, limit = 12 }: { q: string; limit?: number },
  options?: UseSearchUsersOptions,
) {
  const trimmed = q.trim();

  return useQuery({
    queryKey: queryKeys.explore.searchUsers(trimmed, limit),
    queryFn: () => fetchSearchUsers(trimmed, limit),
    enabled: (options?.enabled ?? true) && trimmed.length > 0,
  });
}
