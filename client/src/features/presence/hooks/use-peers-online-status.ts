'use client';

import { useCallback, useMemo } from 'react';

import { usePeersCallStatus } from '@/features/connections/api/connections.queries';
import { PRESENCE_POLL_INTERVAL_MS } from '../constants';

export function usePeersOnlineStatus(userIds: readonly string[]) {
  const { data, isFetching } = usePeersCallStatus(userIds, {
    enabled: userIds.length > 0,
    refetchInterval: PRESENCE_POLL_INTERVAL_MS,
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
