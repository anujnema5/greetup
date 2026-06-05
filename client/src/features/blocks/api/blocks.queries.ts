'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type { BlockedUsersListData } from '../types/blocks-api.types';

const { BLOCKS } = API_ENDPOINTS;

async function fetchBlockedUsers(): Promise<BlockedUsersListData> {
  const data = await apiFetch<BlockedUsersListData | null | undefined>(BLOCKS.LIST);
  if (!data?.items) {
    return { items: [] };
  }
  return data;
}

type UseListBlockedUsersOptions = {
  enabled?: boolean;
};

export function useListBlockedUsers(options?: UseListBlockedUsersOptions) {
  return useQuery({
    queryKey: queryKeys.blocks.list,
    queryFn: fetchBlockedUsers,
    enabled: options?.enabled ?? true,
  });
}
