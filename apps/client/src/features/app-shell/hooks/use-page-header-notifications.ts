"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/features/notifications/api/notifications.mutations";
import {
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/notifications/api/notifications.queries";
import type { NotificationItem } from "@/features/notifications/types/notifications-api.types";
import { notificationRoute } from "@/features/notifications/utils/notification-ui";

import type { PageHeaderNotificationsState } from "../types/page-header-notifications.types";

const NOTIFICATIONS_PAGE_SIZE = 10;
const UNREAD_POLL_INTERVAL_MS = 15_000;

export function usePageHeaderNotifications(): PageHeaderNotificationsState {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadData } = useUnreadNotificationCount({
    refetchInterval: UNREAD_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const { data: notificationsData, isFetching: isLoading } = useNotifications(
    { page: 1, limit: NOTIFICATIONS_PAGE_SIZE },
    {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  );
  const { mutateAsync: markNotificationRead, isPending: isMarkingRead } =
    useMarkNotificationRead();
  const { mutateAsync: markAllNotificationsRead } = useMarkAllNotificationsRead();

  const unreadCount = unreadData?.unreadCount ?? 0;
  const unreadBadgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const notifications = notificationsData?.items ?? [];

  const onOpenNotification = useCallback(
    async (item: NotificationItem) => {
      if (!item.readAt) {
        try {
          await markNotificationRead({ notificationId: item.id });
        } catch {
          // Best effort. Navigation should still happen.
        }
      }
      setIsOpen(false);
      router.push(notificationRoute(item));
    },
    [markNotificationRead, router],
  );

  const onOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open && unreadCount > 0) {
        void markAllNotificationsRead().catch(() => {
            // Best effort; badge may refresh on next poll.
          });
      }
    },
    [markAllNotificationsRead, unreadCount],
  );

  return {
    isOpen,
    onOpenChange,
    unreadCount,
    unreadBadgeLabel,
    notifications,
    isLoading,
    isMarkingRead,
    onOpenNotification,
  };
}
