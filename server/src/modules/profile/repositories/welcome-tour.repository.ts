import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { userProfiles } from "@/core/database/schema";

export const welcomeTourRepository = {
  async getStatus(userId: string): Promise<{
    isOnboarded: boolean;
    welcomeTourSeenAt: Date | null;
  }> {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: {
        isOnboarded: true,
        welcomeTourSeenAt: true,
      },
    });

    return {
      isOnboarded: profile?.isOnboarded ?? false,
      welcomeTourSeenAt: profile?.welcomeTourSeenAt ?? null,
    };
  },

  async markSeen(userId: string, seenAt: Date): Promise<void> {
    await db
      .update(userProfiles)
      .set({ welcomeTourSeenAt: seenAt })
      .where(eq(userProfiles.userId, userId));
  },
};
