import type { QueryClient } from '@tanstack/react-query';

import { invalidateConnectionListCaches } from '../invalidate-after-connection-action';
import { applyPeerConnectionSync } from './apply-peer-connection-sync';
import type { ConnectionNotificationSocketRow } from './connection-realtime.types';

function normalizeNotification(notification: ConnectionNotificationSocketRow | undefined) {
  if (!notification) return null;

  const type = notification.type?.trim();
  const peerUserId = (notification.actorUserId ?? notification.actor_user_id)?.trim();
  const entityType = (notification.entityType ?? notification.entity_type)?.trim();
  const connectionId = (notification.entityId ?? notification.entity_id)?.trim() || null;

  if (!type || !peerUserId) return null;
  if (entityType && entityType !== 'connection') return null;

  return { type, peerUserId, connectionId };
}

/** Handles connection-related `notification:new` payloads. */
export function syncConnectionFromNotification(
  qc: QueryClient,
  notification: ConnectionNotificationSocketRow | undefined,
): void {
  const normalized = normalizeNotification(notification);
  if (!normalized) return;

  const { type, peerUserId, connectionId } = normalized;

  switch (type) {
    case 'connection_request_accepted':
      applyPeerConnectionSync(peerUserId, {
        connectionState: 'accepted',
        connectionId,
      });
      invalidateConnectionListCaches(qc, 'accepted');
      break;

    case 'connection_request_received':
      applyPeerConnectionSync(peerUserId, {
        connectionState: 'pending_incoming',
        connectionId,
      });
      invalidateConnectionListCaches(qc, 'pending_incoming');
      break;

    default:
      break;
  }
}
