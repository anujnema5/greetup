import { and, eq } from "drizzle-orm";

import { db } from "@/core/database";
import { circleRestrictedUsers } from "@/core/database/schema";

export const circleRestrictedUsersRepository = {
  async isUserRestricted(roomId: string, userId: string): Promise<boolean> {
    const row = await db.query.circleRestrictedUsers.findFirst({
      where: and(
        eq(circleRestrictedUsers.roomId, roomId),
        eq(circleRestrictedUsers.userId, userId),
      ),
      columns: { id: true },
    });
    return Boolean(row);
  },

  async restrictUser(roomId: string, userId: string, restrictedByUserId: string): Promise<void> {
    await db
      .insert(circleRestrictedUsers)
      .values({
        roomId,
        userId,
        restrictedByUserId,
      })
      .onConflictDoNothing({
        target: [circleRestrictedUsers.roomId, circleRestrictedUsers.userId],
      });
  },
};
