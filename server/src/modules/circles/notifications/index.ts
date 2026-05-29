import {
  dispatchNotificationWithActor,
} from "@/modules/notifications/services/dispatch-notification.service";
import { circleRoomNotificationDeepLink } from "@/modules/rooms/notifications/circle-room-deep-link";

export async function notifyCircleInviteReceived(params: {
  recipientUserId: string;
  actorUserId: string;
  roomId: string;
  roomTitle: string;
}) {
  return dispatchNotificationWithActor(params.actorUserId, "Someone", ({ actor, actorName }) => ({
    recipientUserId: params.recipientUserId,
    actorUserId: params.actorUserId,
    type: "circle_invite_received",
    entityType: "room",
    entityId: params.roomId,
    title: "Circle invite",
    body: `${actorName} invited you to "${params.roomTitle}".`,
    payload: {
      actor,
      roomId: params.roomId,
      roomTitle: params.roomTitle,
      deepLink: circleRoomNotificationDeepLink(params.roomId),
    },
    dedupeKey: `circle_invite_received:${params.roomId}:${params.recipientUserId}`,
  }));
}
