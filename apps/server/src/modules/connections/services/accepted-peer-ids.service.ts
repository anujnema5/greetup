import logger from "@/core/logging";
import { userConnectionsRepository } from "../repositories/user-connections.repository";

/**
 * User IDs with whom `userId` has an accepted connection (either direction).
 */
export async function getAcceptedPeerIdsForUser(userId: string): Promise<Set<string>> {
  const rows = await userConnectionsRepository.findAcceptedPeerIdColumns(userId);

  const peerIds = new Set<string>();
  for (const row of rows) {
    peerIds.add(row.requesterId === userId ? row.addresseeId : row.requesterId);
  }
  logger.debug("accepted_peer_ids_resolved", { userId, count: peerIds.size });
  return peerIds;
}
