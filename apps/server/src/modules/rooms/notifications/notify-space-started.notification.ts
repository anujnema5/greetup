import {
  dispatchNotificationWithActor,
} from "@/modules/notifications/services/dispatch-notification.service";

import { spaceRoomNotificationDeepLink } from "./space-room-deep-link";

export async function notifySpaceStarted(params: {
  recipientUserId: string;
  actorUserId: string;
  roomId: string;
  roomTitle: string;
}) {
  return dispatchNotificationWithActor(params.actorUserId, "Host", ({ actor, actorName }) => ({
    recipientUserId: params.recipientUserId,
    actorUserId: params.actorUserId,
    type: "space_started",
    entityType: "room",
    entityId: params.roomId,
    title: "Space is live",
    body: `${actorName} started "${params.roomTitle}". Tap to join.`,
    payload: {
      actor,
      roomId: params.roomId,
      roomTitle: params.roomTitle,
      deepLink: spaceRoomNotificationDeepLink(params.roomId),
    },
    dedupeKey: `space_started:${params.roomId}:${params.recipientUserId}`,
  }));
}
