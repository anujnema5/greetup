import { userConnectionsRepository } from "../repositories/user-connections.repository";
import { emitConnectionUpdatedToPeer } from "../socket/emit-connection-updated";

export type DisconnectConnectionResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" };

export async function disconnectConnectionService(
  viewerId: string,
  connectionId: string,

): Promise<DisconnectConnectionResult> {
  const row = await userConnectionsRepository.findByIdForDisconnect(connectionId);

  if (!row) {
    return { ok: false, error: "NOT_FOUND" };
  }

  if (row.requesterId !== viewerId && row.addresseeId !== viewerId) {
    return { ok: false, error: "FORBIDDEN" };
  }

  if (row.status !== "accepted") {
    return { ok: false, error: "INVALID_STATE" };
  }

  await userConnectionsRepository.cancelAcceptedConnectionAsPeer(connectionId, viewerId);
  emitConnectionUpdatedToPeer(viewerId, row, "none");
  return { ok: true };
}

