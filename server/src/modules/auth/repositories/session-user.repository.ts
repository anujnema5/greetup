import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { users, userProfiles } from "@/core/database/schema";

export type SessionUserContextRow = {
  name: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  isOnboarded: boolean;
  isGuest: boolean;
  guestTrialConsumed: boolean;
};

export const sessionUserRepository = {
  /** Identity + routing flags in one round trip (users LEFT JOIN user_profiles). */
  async findSessionContextByUserId(
    userId: string,
  ): Promise<SessionUserContextRow | null> {
    const [row] = await db
      .select({
        name: users.name,
        displayName: users.displayName,
        phoneNumber: users.phoneNumber,
        isOnboarded: userProfiles.isOnboarded,
        isGuest: userProfiles.isGuest,
        guestTrialConsumedAt: userProfiles.guestTrialConsumedAt,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) return null;

    return {
      name: row.name,
      displayName: row.displayName,
      phoneNumber: row.phoneNumber,
      isOnboarded: row.isOnboarded ?? false,
      isGuest: row.isGuest ?? false,
      guestTrialConsumed: row.guestTrialConsumedAt != null,
    };
  },
};
