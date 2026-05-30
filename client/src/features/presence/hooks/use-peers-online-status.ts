'use client';

import { useCallback, useMemo } from 'react';
import { connectionsApi } from '@/features/connections/api/connections-api';
import { peersCallStatusCacheKey } from '../lib/peers-call-status-cache-key';
import { PRESENCE_POLL_INTERVAL_MS } from '../constants';

export function usePeersOnlineStatus(userIds: readonly string[]) {
  const cacheKey = useMemo(() => peersCallStatusCacheKey(userIds), [userIds]);

  const { data, isFetching } = connectionsApi.usePeersCallStatusQuery(cacheKey, {
    skip: cacheKey.length === 0,
    pollingInterval: PRESENCE_POLL_INTERVAL_MS,
    refetchOnFocus: true,
  });

  const isOnline = useCallback(
    (userId: string) => data?.[userId]?.isOnline ?? false,
    [data],
  );

  const isInCall = useCallback(
    (userId: string) => data?.[userId]?.inLiveRoom ?? false,
    [data],
  );

  return { statusMap: data ?? {}, isOnline, isInCall, isLoading: isFetching && !data };
}

export function useUserOnlineStatus(userId: string | null | undefined) {
  const ids = useMemo(() => (userId ? [userId] : []), [userId]);
  const { isOnline, isInCall, isLoading } = usePeersOnlineStatus(ids);
  return {
    isOnline: userId ? isOnline(userId) : false,
    isInCall: userId ? isInCall(userId) : false,
    isLoading,
  };
}
