import type { QueryClient } from '@tanstack/react-query';

import type { PublicProfileConnectionState } from '@/features/user-profile/types/public-profile.types';

import { invalidateConnectionListCaches } from '../invalidate-after-connection-action';
import { applyPeerConnectionSync } from './apply-peer-connection-sync';
import type { ConnectionUpdatedSocketPayload } from './connection-realtime.types';

function normalizeSocketPayload(payload: ConnectionUpdatedSocketPayload | undefined) {
  if (!payload) return null;

  const peerUserId = (payload.peerUserId ?? payload.peer_user_id)?.trim();
  const connectionId = (payload.connectionId ?? payload.connection_id)?.trim() || null;
  const status = payload.status;

  if (!peerUserId || !status) return null;
  return { peerUserId, connectionId, status };
}

function mapSocketStatusToState(
  status: ConnectionUpdatedSocketPayload['status'],
): PublicProfileConnectionState | null {
  switch (status) {
    case 'accepted':
      return 'accepted';
    case 'pending':
      return 'pending_incoming';
    case 'rejected':
      return 'rejected';
    case 'cancelled':
      return 'cancelled';
    case 'none':
      return 'none';
    default:
      return null;
  }
}

/** Handles `connection:updated` — keeps in-call hover and lists in sync. */
export function syncConnectionFromSocket(
  qc: QueryClient,
  payload: ConnectionUpdatedSocketPayload | undefined,
): void {
  const normalized = normalizeSocketPayload(payload);
  if (!normalized) return;

  const connectionState = mapSocketStatusToState(normalized.status);
  if (!connectionState) return;

  const connectionId = connectionState === 'none' ? null : normalized.connectionId;

  applyPeerConnectionSync(normalized.peerUserId, { connectionState, connectionId });

  // Avoid invalidating MatchPeerPreview: refetch can restore stale "accepted" while hover is open.
  invalidateConnectionListCaches(qc, connectionState);
}
