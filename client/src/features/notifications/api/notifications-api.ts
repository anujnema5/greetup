import { API_ENDPOINTS, baseApi } from "@/lib/api";

import type { NotificationsListResponse, UnreadCountResponse } from "../types/notifications-api.types";
import {
  NOTIFICATION_TAG_LIST,
  NOTIFICATION_TAG_UNREAD_COUNT,
  notificationInvalidationTags,
} from "../constants";

const { NOTIFICATIONS } = API_ENDPOINTS;

type GetNotificationsArgs = {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
};

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<NotificationsListResponse, GetNotificationsArgs | void>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const limit = arg?.limit ?? 20;
        const unreadOnly = arg?.unreadOnly ?? false;
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          unreadOnly: unreadOnly ? "true" : "false",
        });
        return `${NOTIFICATIONS.LIST}?${params.toString()}`;
      },
      providesTags: [{ type: "Notifications", id: NOTIFICATION_TAG_LIST }],
    }),

    getUnreadNotificationCount: build.query<UnreadCountResponse, void>({
      query: () => NOTIFICATIONS.UNREAD_COUNT,
      providesTags: [{ type: "Notifications", id: NOTIFICATION_TAG_UNREAD_COUNT }],
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
