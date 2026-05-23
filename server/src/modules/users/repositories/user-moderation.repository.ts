import { and, count, eq, gte, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { nsfwModerationEvents, users } from "@/core/database/schema";

/** Strikes older than this do not count toward the warn → ban ladder. */
export const NSFW_STRIKE_WINDOW_DAYS = 90;

export type NsfwClientScore = {
  className: string;
  probability: number;
};

export type RecordLiveCircleNsfwViolationInput = {
  userId: string;
  roomId: string;
  clientScores?: NsfwClientScore[];
};

export const userModerationRepository = {
  async countActiveNsfwStrikes(userId: string): Promise<number> {
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - NSFW_STRIKE_WINDOW_DAYS);

    const [row] = await db
      .select({ total: count() })
      .from(nsfwModerationEvents)
      .where(
        and(
          eq(nsfwModerationEvents.userId, userId),
          eq(nsfwModerationEvents.overturned, false),
          gte(nsfwModerationEvents.createdAt, windowStart),
        ),
      );

    return Number(row?.total ?? 0);
  },

  async recordLiveCircleNsfwViolation(
    input: RecordLiveCircleNsfwViolationInput,
  ): Promise<{ strikeCount: number; actionTaken: "warned_and_kicked" | "account_banned" }> {
    const priorStrikes = await this.countActiveNsfwStrikes(input.userId);
    const strikeIndex = priorStrikes + 1;
    const actionTaken = strikeIndex >= 2 ? "account_banned" : "warned_and_kicked";

    await db.insert(nsfwModerationEvents).values({
      userId: input.userId,
      roomId: input.roomId,
      source: "live_circle_self",
      strikeIndex,
      actionTaken,
      clientScores: input.clientScores?.length ? input.clientScores : null,
    });

    return { strikeCount: strikeIndex, actionTaken };
  },

  async setBanned(userId: string, status: "yes" | "temporarily" | "no"): Promise<void> {
    await db
      .update(users)
      .set({ isBanned: status, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },

  /** Admin / appeal path: exclude an event from strike totals. */
  async overturnNsfwEvent(eventId: string): Promise<void> {
    await db
      .update(nsfwModerationEvents)
      .set({
        overturned: true,
        overturnedAt: sql`now()`,
      })
      .where(eq(nsfwModerationEvents.id, eventId));
  },
};
