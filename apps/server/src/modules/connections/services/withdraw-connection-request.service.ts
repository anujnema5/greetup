import logger from "@/core/logging";
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
    logger.warn("connection_withdraw_rejected", { viewerId, connectionId, error: "NOT_FOUND" });
    return { ok: false, error: "NOT_FOUND" };
  }

  if (row.requesterId !== viewerId) {
    logger.warn("connection_withdraw_rejected", { viewerId, connectionId, error: "FORBIDDEN" });
    return { ok: false, error: "FORBIDDEN" };
  }

  if (row.status !== "pending") {
    logger.warn("connection_withdraw_rejected", { viewerId, connectionId, error: "INVALID_STATE", status: row.status });
    return { ok: false, error: "INVALID_STATE" };
  }

  await userConnectionsRepository.cancelPendingOutgoingRequest(connectionId, viewerId);
  emitConnectionUpdated(row.addresseeId, {
    peerUserId: viewerId,
    connectionId: row.id,
    status: "none",
  });
  logger.info("connection_request_withdrawn", { viewerId, connectionId, addresseeId: row.addresseeId });
  return { ok: true };
}

