import logger from "@/core/logging";
import { userConnectionsRepository } from "../repositories/user-connections.repository";

export async function pendingIncomingCountForUser(userId: string): Promise<number> {
  const count = await userConnectionsRepository.countForListFilter(userId, "pending_incoming");
  logger.debug("pending_incoming_connections_counted", { userId, count });
  return count;
}
