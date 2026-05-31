import type { NotificationItem } from "@/features/notifications/types/notifications-api.types";

export type PageHeaderNotificationsState = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  unreadCount: number;
  unreadBadgeLabel: string;
  notifications: NotificationItem[];
  isLoading: boolean;
  isMarkingRead: boolean;
  onOpenNotification: (item: NotificationItem) => void | Promise<void>;
};
