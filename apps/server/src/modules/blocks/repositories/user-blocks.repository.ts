import { and, desc, eq, or } from "drizzle-orm";

import { db } from "@/core/database";
import { userBlocks, users } from "@/core/database/schema";

export type BlockedUserRow = {
  userId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  blockedAt: Date;
};

export const userBlocksRepository = {
  async isEitherBlocked(a: string, b: string): Promise<boolean> {
    const row = await db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
          and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a)),
        ),
      )
      .limit(1);
    return row.length > 0;
  },

  async isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
    const row = await db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)),
      )
      .limit(1);
    return row.length > 0;
  },

  async createBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const existing = await userBlocksRepository.isBlockedBy(blockerId, blockedId);
    if (existing) return false;

    await db.insert(userBlocks).values({ blockerId, blockedId });
    return true;
  },

  async removeBlock(blockerId: string, blockedId: string): Promise<boolean> {
    const result = await db
      .delete(userBlocks)
      .where(
        and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedId, blockedId)),
      )
      .returning({ id: userBlocks.id });
    return result.length > 0;
  },

  /** Users this user has blocked. */
  async listBlockedUserIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ id: userBlocks.blockedId })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, userId));
    return rows.map((r) => r.id);
  },

  /** Users who blocked this user. */
  async listBlockerUserIds(userId: string): Promise<string[]> {
    const rows = await db
      .select({ id: userBlocks.blockerId })
      .from(userBlocks)
      .where(eq(userBlocks.blockedId, userId));
    return rows.map((r) => r.id);
  },

  async listAllBlockedPeerIds(userId: string): Promise<string[]> {
    const [outgoing, incoming] = await Promise.all([
      userBlocksRepository.listBlockedUserIds(userId),
      userBlocksRepository.listBlockerUserIds(userId),
    ]);
    return [...new Set([...outgoing, ...incoming])];
  },

  /** Users blocked by the viewer, with basic profile fields for settings UI. */
  async listBlockedUsersForViewer(viewerId: string): Promise<BlockedUserRow[]> {
    return db
      .select({
        userId: users.id,
        username: users.username,
        displayName: users.displayName,
        name: users.name,
        image: users.image,
        blockedAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .innerJoin(users, eq(userBlocks.blockedId, users.id))
      .where(eq(userBlocks.blockerId, viewerId))
      .orderBy(desc(userBlocks.createdAt));
  },
};
