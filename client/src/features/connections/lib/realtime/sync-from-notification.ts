import { baseApi } from "@/lib/api";
import type { AppDispatch } from "@/lib/redux/store";
import { applyPeerConnectionSync } from "./apply-peer-connection-sync";
import type { ConnectionNotificationSocketRow } from "./connection-realtime.types";
import { connectionListInvalidationTags } from "./invalidate-connection-list-tags";

function normalizeNotification(notification: ConnectionNotificationSocketRow | undefined) {
  if (!notification) return null;

  const type = notification.type?.trim();
  const peerUserId = (notification.actorUserId ?? notification.actor_user_id)?.trim();
  const entityType = (notification.entityType ?? notification.entity_type)?.trim();
  const connectionId = (notification.entityId ?? notification.entity_id)?.trim() || null;

  if (!type || !peerUserId) return null;
  if (entityType && entityType !== "connection") return null;

  return { type, peerUserId, connectionId };
}

/** Handles connection-related `notification:new` payloads. */
export function syncConnectionFromNotification(
  dispatch: AppDispatch,
  notification: ConnectionNotificationSocketRow | undefined,
): void {
  const normalized = normalizeNotification(notification);
  if (!normalized) return;

  const { type, peerUserId, connectionId } = normalized;

  switch (type) {
    case "connection_request_accepted":
      applyPeerConnectionSync(dispatch, peerUserId, {
        connectionState: "accepted",
        connectionId,
      });
      dispatch(baseApi.util.invalidateTags(connectionListInvalidationTags("accepted")));
      break;

    case "connection_request_received":
      applyPeerConnectionSync(dispatch, peerUserId, {
        connectionState: "pending_incoming",
        connectionId,
      });
      dispatch(baseApi.util.invalidateTags(connectionListInvalidationTags("pending_incoming")));
      break;

    default:
      break;
  }
}
