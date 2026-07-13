import logger from "@/core/logging";
import { userConnectionsRepository } from "../repositories/user-connections.repository";
import { emitConnectionUpdatedToPeer } from "../socket/emit-connection-updated";
import { removeMatchingConnectionPeers } from "@/modules/matching/services/sync-matching-connection-peers.service";

export type DisconnectConnectionResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" };

export async function disconnectConnectionService(
  viewerId: string,
  connectionId: string,

): Promise<DisconnectConnectionResult> {
  const row = await userConnectionsRepository.findByIdForDisconnect(connectionId);

  if (!row) {
    logger.warn("connection_disconnect_rejected", { viewerId, connectionId, error: "NOT_FOUND" });
    return { ok: false, error: "NOT_FOUND" };
  }

  if (row.requesterId !== viewerId && row.addresseeId !== viewerId) {
    logger.warn("connection_disconnect_rejected", { viewerId, connectionId, error: "FORBIDDEN" });
    return { ok: false, error: "FORBIDDEN" };
  }

  if (row.status !== "accepted") {
    logger.warn("connection_disconnect_rejected", { viewerId, connectionId, error: "INVALID_STATE", status: row.status });
    return { ok: false, error: "INVALID_STATE" };
  }

  await userConnectionsRepository.cancelAcceptedConnectionAsPeer(connectionId, viewerId);
  const peerUserId = row.requesterId === viewerId ? row.addresseeId : row.requesterId;
  await removeMatchingConnectionPeers(viewerId, peerUserId);
  emitConnectionUpdatedToPeer(viewerId, row, "none");
  logger.info("connection_disconnected", { viewerId, connectionId, peerUserId });
  return { ok: true };
}

