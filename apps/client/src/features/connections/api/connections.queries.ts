'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch, buildQueryParams } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type {
  ConnectionListFilter,
  ListConnectionsData,
  PeerCallStatusEntry,
} from '../types/connections-api.types';

const { CONNECTIONS } = API_ENDPOINTS;

export type ListConnectionsQueryArg = {
  filter?: ConnectionListFilter;
  page?: number;
  limit?: number;
  q?: string;
};

async function fetchMyConnections(
  args: ListConnectionsQueryArg = {},
): Promise<ListConnectionsData> {
  const qs = buildQueryParams({
    filter: args.filter ?? 'accepted',
    page: args.page,
    limit: args.limit,
    q: args.q,
  });
  const path = qs ? `${CONNECTIONS.LIST}?${qs}` : CONNECTIONS.LIST;
  try {
    const data = await apiFetch<ListConnectionsData | null | undefined>(path);
    return data ?? { items: [] };
  } catch {
    return { items: [] };
  }
}

async function fetchPeersCallStatus(
  userIds: readonly string[],
): Promise<Record<string, PeerCallStatusEntry>> {
  const data = await apiFetch<{ statuses: Record<string, PeerCallStatusEntry> }>(
    CONNECTIONS.PEERS_CALL_STATUS,
    {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    },
  );
  return data?.statuses ?? {};
}

function stablePeerIds(userIds: readonly string[]): string[] {
  return [...new Set(userIds.filter((id) => typeof id === 'string' && id.length > 0))].sort();
}

export function useMyConnections(
  args: ListConnectionsQueryArg = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.connections.list(args),
    queryFn: () => fetchMyConnections(args),
    enabled: options?.enabled ?? true,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

export function usePendingIncomingConnectionCount(options?: {
  refetchInterval?: number;
}) {
  return useQuery({
    queryKey: queryKeys.connections.pendingCount,
    queryFn: async () => {
      const data = await apiFetch<{ pendingIncomingCount: number } | null | undefined>(
        CONNECTIONS.PENDING_INCOMING_COUNT,
      );
      return data?.pendingIncomingCount ?? 0;
    },
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: true,
  });
}

export function usePeersCallStatus(
  userIds: readonly string[],
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    refetchOnMount?: boolean;
  },
) {
  const stableIds = stablePeerIds(userIds);

  return useQuery({
    queryKey: queryKeys.connections.peersCallStatus(stableIds),
    queryFn: () => fetchPeersCallStatus(stableIds),
    enabled: (options?.enabled ?? true) && stableIds.length > 0,
    refetchInterval: options?.refetchInterval,
    refetchOnMount: options?.refetchOnMount ?? true,
    refetchOnWindowFocus: true,
  });
}

/** Paginated accepted connections with optional search. */
export function useAcceptedConnections(
  args: { limit: number; q?: string },
  enabled = true,
) {
  const q = args.q;

  return useInfiniteQuery({
    queryKey: queryKeys.connections.acceptedInfinite(args.limit, q),
    queryFn: ({ pageParam }) =>
      fetchMyConnections({
        filter: 'accepted',
        page: pageParam,
        limit: args.limit,
        q,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) return undefined;
      return (lastPage.page ?? 1) + 1;
    },
    enabled,
    refetchOnMount: true,
  });
}
