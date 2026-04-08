import {
  dispatchNotificationWithActor,
} from "@/modules/notifications/services/dispatch-notification.service";

export async function notifyCircleStarted(params: {
  recipientUserId: string;
  actorUserId: string;
  roomId: string;
  roomTitle: string;
}) {
  return dispatchNotificationWithActor(params.actorUserId, "Host", ({ actor, actorName }) => ({
    recipientUserId: params.recipientUserId,
    actorUserId: params.actorUserId,
    type: "circle_started",
    entityType: "room",
    entityId: params.roomId,
    title: "Circle is live",
    body: `${actorName} started "${params.roomTitle}".`,
    payload: {
      actor,
      roomId: params.roomId,
      roomTitle: params.roomTitle,
      deepLink: "/",
    },
    dedupeKey: `circle_started:${params.roomId}:${params.recipientUserId}`,
  }));
}
