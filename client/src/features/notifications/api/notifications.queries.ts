'use client';

import { useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch, buildQueryParams } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type {
  NotificationsListData,
  UnreadCountResponse,
} from '../types/notifications-api.types';

const { NOTIFICATIONS } = API_ENDPOINTS;

export type GetNotificationsArgs = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

type UseNotificationsOptions = {
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

export function useNotifications(
  arg?: GetNotificationsArgs,
  options?: UseNotificationsOptions,
) {
  const page = arg?.page ?? 1;
  const limit = arg?.limit ?? 20;
  const unreadOnly = arg?.unreadOnly ?? false;

  return useQuery({
    queryKey: queryKeys.notifications.list(page, limit, unreadOnly),
    queryFn: async () => {
      const qs = buildQueryParams({
        page,
        limit,
        unreadOnly: unreadOnly ? 'true' : 'false',
      });
      return apiFetch<NotificationsListData>(`${NOTIFICATIONS.LIST}?${qs}`);
    },
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
  });
}

type UseUnreadNotificationCountOptions = {
  enabled?: boolean;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

export function useUnreadNotificationCount(options?: UseUnreadNotificationCountOptions) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const data = await apiFetch<UnreadCountResponse['data']>(NOTIFICATIONS.UNREAD_COUNT);
      return data ?? { unreadCount: 0 };
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    refetchOnReconnect: options?.refetchOnReconnect,
  });
}
