import type { NotificationItem } from "../types/notifications-api.types";
import { spaceRoomPath } from "@/features/room/lib/navigation/space-routes";

export function formatNotificationTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Just now";
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) return "Just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  return `${Math.floor(diffMs / day)}d ago`;
}

function isSpaceNotificationType(type: NotificationItem["type"]): boolean {
  return type === "space_started" || type === "space_invite_received";
}

export function notificationRoute(item: NotificationItem): string {
  // Keep connection notifications deterministic so clicks always land
  // on the expected section inside Connections.
  if (item.type === "connection_request_received") {
    return "/connections?filter=pending_incoming";
  }
  if (item.type === "connection_request_accepted") {
    return "/connections?filter=accepted";
  }

  if (isSpaceNotificationType(item.type)) {
    const roomId = item.payload?.roomId;
    if (typeof roomId === "string" && roomId.trim()) {
      return spaceRoomPath(roomId.trim());
    }
    if (item.entityType === "room" && item.entityId.trim()) {
      return spaceRoomPath(item.entityId.trim());
    }
  }

  const deepLink = item.payload?.deepLink;
  if (typeof deepLink === "string" && deepLink.trim()) {
    return deepLink;
  }

  return "/home";
}
