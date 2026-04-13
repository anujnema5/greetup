/**
 * Notifications feature — RTK Query endpoints.
 *
 * 1. Cache tags (shared ids live in `../constants` for reuse)
 * 2. List query args
 * 3. Endpoints (list + unread count + mark read)
 */

import { API_ENDPOINTS, baseApi, buildQueryParams } from "@/lib/api";

import type { NotificationsListResponse, UnreadCountResponse } from "../types/notifications-api.types";
import {
  NOTIFICATION_TAG_LIST,
  NOTIFICATION_TAG_UNREAD_COUNT,
  notificationInvalidationTags,
} from "../constants";

const { NOTIFICATIONS } = API_ENDPOINTS;

// ── Cache tags (RTK) ──────────────────────────────────────────────────────────

const CACHE_NOTIFICATIONS_LIST = {
  type: "Notifications" as const,
  id: NOTIFICATION_TAG_LIST,
};

const CACHE_NOTIFICATIONS_UNREAD_COUNT = {
  type: "Notifications" as const,
  id: NOTIFICATION_TAG_UNREAD_COUNT,
};

// ── Types ─────────────────────────────────────────────────────────────────────

type GetNotificationsArgs = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

// ── API slice ─────────────────────────────────────────────────────────────────

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<NotificationsListResponse, GetNotificationsArgs | void>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const limit = arg?.limit ?? 20;
        const unreadOnly = arg?.unreadOnly ?? false;

        const qs = buildQueryParams({
          page,
          limit,
          unreadOnly: unreadOnly ? "true" : "false",
        });

        return `${NOTIFICATIONS.LIST}?${qs}`;
      },
      providesTags: [CACHE_NOTIFICATIONS_LIST],
    }),

    getUnreadNotificationCount: build.query<UnreadCountResponse, void>({
      query: () => NOTIFICATIONS.UNREAD_COUNT,
      providesTags: [CACHE_NOTIFICATIONS_UNREAD_COUNT],
    }),

    markNotificationRead: build.mutation<unknown, { notificationId: string }>({
      query: ({ notificationId }) => ({
        url: NOTIFICATIONS.markRead(notificationId),
        method: "POST",
      }),
      invalidatesTags: notificationInvalidationTags,
    }),

    markAllNotificationsRead: build.mutation<unknown, void>({
      query: () => ({
        url: NOTIFICATIONS.READ_ALL,
        method: "POST",
      }),
      invalidatesTags: notificationInvalidationTags,
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
