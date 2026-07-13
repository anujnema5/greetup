import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import { session } from "@/core/database/schema";

export const guestSessionRepository = {
  async setExpiresAt(sessionId: string, expiresAt: Date): Promise<void> {
    const now = new Date();
    await db
      .update(session)
      .set({
        expiresAt,
        updatedAt: now,
      })
      .where(eq(session.id, sessionId));
  },
};
