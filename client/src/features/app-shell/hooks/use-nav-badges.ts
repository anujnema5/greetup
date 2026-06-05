'use client';

import { useMemo } from 'react';
import { useGetPendingIncomingConnectionCountQuery } from '@/features/connections/api/connections-api';
import { useTotalUnreadMessageCount } from '@/features/chat/hooks/use-total-unread-message-count';
import type { NavBadgeId } from '../constants/nav-config';

export type NavBadgeSnapshot = {
  count: number;
  titleSuffix: string;
};

export type NavBadgeLookup = (badgeId?: NavBadgeId) => NavBadgeSnapshot | null;

/**
 * Central registry for sidebar / bottom-nav badge counts.
 * To add a badge: extend `NavBadgeId`, assign `badgeId` on a `NAV_ITEMS` entry, wire the count here.
 */
export function useNavBadgeLookup(): NavBadgeLookup {
  const { data: pendingIncomingData } = useGetPendingIncomingConnectionCountQuery(undefined, {
    pollingInterval: 15_000,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const pendingIncomingCount = pendingIncomingData?.data?.pendingIncomingCount ?? 0;
  const unreadMessageCount = useTotalUnreadMessageCount();

  return useMemo(() => {
    const byId: Partial<Record<NavBadgeId, NavBadgeSnapshot>> = {
      connectionsPending:
        pendingIncomingCount > 0
          ? { count: pendingIncomingCount, titleSuffix: `${pendingIncomingCount} pending` }
          : undefined,
      messagesUnread:
        unreadMessageCount > 0
          ? { count: unreadMessageCount, titleSuffix: `${unreadMessageCount} unread` }
          : undefined,
    };

    return (badgeId?: NavBadgeId) => (badgeId ? (byId[badgeId] ?? null) : null);
  }, [pendingIncomingCount, unreadMessageCount]);
}
