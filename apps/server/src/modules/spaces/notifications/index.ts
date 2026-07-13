import {
  dispatchNotificationWithActor,
} from "@/modules/notifications/services/dispatch-notification.service";
import { spaceRoomNotificationDeepLink } from "@/modules/rooms/notifications/space-room-deep-link";

export async function notifySpaceInviteReceived(params: {
  recipientUserId: string;
  actorUserId: string;
  roomId: string;
  roomTitle: string;
}) {
  return dispatchNotificationWithActor(params.actorUserId, "Someone", ({ actor, actorName }) => ({
    recipientUserId: params.recipientUserId,
    actorUserId: params.actorUserId,
    type: "space_invite_received",
    entityType: "room",
    entityId: params.roomId,
    title: "Space invite",
    body: `${actorName} invited you to "${params.roomTitle}".`,
    payload: {
      actor,
      roomId: params.roomId,
      roomTitle: params.roomTitle,
      deepLink: spaceRoomNotificationDeepLink(params.roomId),
    },
    dedupeKey: `space_invite_received:${params.roomId}:${params.recipientUserId}`,
  }));
}
