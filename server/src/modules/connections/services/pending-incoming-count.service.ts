import { userConnectionsRepository } from "../repositories/user-connections.repository";

export async function pendingIncomingCountForUser(userId: string): Promise<number> {
  return userConnectionsRepository.countForListFilter(userId, "pending_incoming");
}
