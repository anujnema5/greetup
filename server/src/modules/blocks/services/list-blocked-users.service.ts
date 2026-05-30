import { userBlocksRepository } from "../repositories/user-blocks.repository";

export type BlockedUserListItem = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  blockedAt: string;
};

export async function listBlockedUsersService(viewerId: string): Promise<BlockedUserListItem[]> {
  const rows = await userBlocksRepository.listBlockedUsersForViewer(viewerId);
  return rows.map((row) => ({
    userId: row.userId,
    username: row.username,
    displayName: row.displayName,
    name: row.name,
    image: row.image,
    blockedAt: row.blockedAt.toISOString(),
  }));
}
