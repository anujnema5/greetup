import { and, eq } from "drizzle-orm";

import { db } from "@/core/database";
import { profileMatchPrepSessions } from "@/core/database/schema";

export const matchPrepSessionRepository = {
  /**
   * True only after the user saved match prep for this browser tab session.
   * Skip / dismiss do not insert a row, so the prompt can appear again until they save.
   */
  async hasSavedMatchPrepForClientSession(
    profileId: string,
    clientSessionId: string,
  ): Promise<boolean> {
    const row = await db.query.profileMatchPrepSessions.findFirst({
      where: and(
        eq(profileMatchPrepSessions.profileId, profileId),
        eq(profileMatchPrepSessions.clientSessionId, clientSessionId),
        eq(profileMatchPrepSessions.source, "save"),
      ),
      columns: { id: true },
    });
    return row != null;
  },

  /** Marks this tab session as having saved match prep (upserts so an old skip/dismiss row becomes save). */
  async recordSaveForClientSession(
    profileId: string,
    clientSessionId: string,
  ): Promise<void> {
    const now = new Date();
    await db
      .insert(profileMatchPrepSessions)
      .values({
        profileId,
        clientSessionId,
        source: "save",
        acknowledgedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          profileMatchPrepSessions.profileId,
          profileMatchPrepSessions.clientSessionId,
        ],
        set: {
          source: "save",
          acknowledgedAt: now,
        },
      });
  },
};
