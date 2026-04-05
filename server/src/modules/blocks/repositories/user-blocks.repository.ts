import { and, eq, or } from "drizzle-orm";

import { db } from "@/core/database";
import { userBlocks } from "@/core/database/schema";

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
};
