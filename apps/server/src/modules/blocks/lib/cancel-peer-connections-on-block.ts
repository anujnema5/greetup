import { userConnectionsRepository } from "@/modules/connections/repositories/user-connections.repository";
import { emitConnectionUpdatedToPeer } from "@/modules/connections/socket/emit-connection-updated";

/** Clears active or pending connection rows after a block (both directions). */
export async function cancelPeerConnectionsOnBlock(
  viewerId: string,
  targetUserId: string,
): Promise<void> {
  const rows = await userConnectionsRepository.findAllBetween(viewerId, targetUserId);

  for (const row of rows) {
    if (row.status === "accepted") {
      await userConnectionsRepository.cancelAcceptedConnectionAsPeer(row.id, viewerId);
      emitConnectionUpdatedToPeer(viewerId, row, "none");
      continue;
    }

    if (row.status !== "pending") continue;

    if (row.requesterId === viewerId) {
      await userConnectionsRepository.cancelPendingOutgoingRequest(row.id, viewerId);
    } else {
      await userConnectionsRepository.updateStatusById(row.id, "rejected");
    }
    emitConnectionUpdatedToPeer(viewerId, row, "none");
  }
}
