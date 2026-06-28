import type { ApiResponse } from "@/features/profile-setup/types/profile-setup-api.types";

export type NotificationItem = {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  type:
    | "connection_request_received"
    | "connection_request_accepted"
    | "space_invite_received"
    | "space_started";
  entityType: "connection" | "room";
  entityId: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  dedupeKey: string | null;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationsListData = {
  items: NotificationItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type NotificationsListResponse = ApiResponse<NotificationsListData>;
export type UnreadCountResponse = ApiResponse<{ unreadCount: number }>;
