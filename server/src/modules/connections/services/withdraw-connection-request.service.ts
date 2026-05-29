import { userConnectionsRepository } from "../repositories/user-connections.repository";
import { emitConnectionUpdated } from "../socket/emit-connection-updated";

export type WithdrawConnectionRequestResult =
  | { ok: true }
  | { ok: false; error: "NOT_FOUND" | "FORBIDDEN" | "INVALID_STATE" };

export async function withdrawConnectionRequestService(
  viewerId: string,
  connectionId: string,

): Promise<WithdrawConnectionRequestResult> {

  const row = await userConnectionsRepository.findByIdForWithdraw(connectionId);
  if (!row) {
    return { ok: false, error: "NOT_FOUND" };
  }

  if (row.requesterId !== viewerId) {
    return { ok: false, error: "FORBIDDEN" };
  }

  if (row.status !== "pending") {
    return { ok: false, error: "INVALID_STATE" };
  }

  await userConnectionsRepository.cancelPendingOutgoingRequest(connectionId, viewerId);
  emitConnectionUpdated(row.addresseeId, {
    peerUserId: viewerId,
    connectionId: row.id,
    status: "none",
  });
  return { ok: true };
}

