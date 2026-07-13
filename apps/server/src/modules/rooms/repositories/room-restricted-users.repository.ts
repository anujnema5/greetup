import { and, eq } from "drizzle-orm";

import { db } from "@/core/database";
import { roomRestrictedUsers } from "@/core/database/schema";

export const roomRestrictedUsersRepository = {
  async isRoomRestrictedUser(roomId: string, userId: string): Promise<boolean> {
    const row = await db.query.roomRestrictedUsers.findFirst({
      where: and(
        eq(roomRestrictedUsers.roomId, roomId),
        eq(roomRestrictedUsers.userId, userId),
      ),
      columns: { id: true },
    });
    return Boolean(row);
  },

  async addRoomRestrictedUser(
    roomId: string,
    userId: string,
    restrictedByUserId: string,
  ): Promise<void> {
    await db
      .insert(roomRestrictedUsers)
      .values({
        roomId,
        userId,
        restrictedByUserId,
      })
      .onConflictDoNothing({
        target: [roomRestrictedUsers.roomId, roomRestrictedUsers.userId],
      });
  },
};
