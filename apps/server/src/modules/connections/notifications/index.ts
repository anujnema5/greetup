import {
  dispatchNotificationWithActor,
} from "@/modules/notifications/services/dispatch-notification.service";

export async function notifyConnectionRequestReceived(params: {
  recipientUserId: string;
  actorUserId: string;
  connectionId: string;
  dedupeSalt?: string;
}) {
  const salt = params.dedupeSalt ?? "default";

  return dispatchNotificationWithActor(params.actorUserId, "Someone", ({ actor, actorName }) => ({
    recipientUserId: params.recipientUserId,
    actorUserId: params.actorUserId,
    type: "connection_request_received",
    entityType: "connection",
    entityId: params.connectionId,
    title: "New connection request",
    body: `${actorName} sent you a connection request.`,
    payload: {
      actor,
      connectionId: params.connectionId,
      deepLink: "/connections?filter=pending_incoming",
    },
    dedupeKey:
      `connection_request_received:${params.connectionId}:${params.recipientUserId}:${salt}`,
  }));
}

export async function notifyConnectionRequestAccepted(params: {
  recipientUserId: string;
  actorUserId: string;
  connectionId: string;
}) {
  return dispatchNotificationWithActor(params.actorUserId, "Someone", ({ actor, actorName }) => ({
    recipientUserId: params.recipientUserId,
    actorUserId: params.actorUserId,
    type: "connection_request_accepted",
    entityType: "connection",
    entityId: params.connectionId,
    title: "Connection accepted",
    body: `${actorName} accepted your connection request.`,
    payload: {
      actor,
      connectionId: params.connectionId,
      deepLink: "/connections?filter=accepted",
    },
    dedupeKey: `connection_request_accepted:${params.connectionId}:${params.recipientUserId}`,
  }));
}
