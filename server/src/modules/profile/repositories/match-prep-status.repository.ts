import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  currentStatus,
  currentStatusLookingFor,
  currentStatusMoods,
  profileInterests,
} from "@/core/database/schema";

type ConnectionPreference =
  | "same_profession"
  | "different_profession"
  | "open_to_anyone";

export const matchPrepStatusRepository = {
  async replaceMatchPrepCurrentStatus(
    profileId: string,
    data: {
      moodIds: string[];
      lookingForIds: string[];
      /** Replaces `profile_interests` for this profile (Redis snapshot interests). */
      interestIds: string[];
      sessionGoal: string | null;
      connectionPreference: ConnectionPreference | null;
    },
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(profileInterests)
        .where(eq(profileInterests.profileId, profileId));
      if (data.interestIds.length > 0) {
        await tx.insert(profileInterests).values(
          data.interestIds.map((interestId) => ({ profileId, interestId })),
        );
      }

      const existing = await tx.query.currentStatus.findFirst({
        where: eq(currentStatus.profileId, profileId),
        columns: { id: true },
      });

      const now = new Date();
      let statusId: string;

      if (existing) {
        statusId = existing.id;
        await tx
          .update(currentStatus)
          .set({
            sessionGoal: data.sessionGoal,
            connectionPreference: data.connectionPreference ?? null,
            availability: "available",
            lastActiveAt: now,
            updatedAt: now,
          })
          .where(eq(currentStatus.id, statusId));
      } else {
        const [inserted] = await tx
          .insert(currentStatus)
          .values({
            profileId,
            sessionGoal: data.sessionGoal,
            connectionPreference: data.connectionPreference ?? null,
            availability: "available",
            lastActiveAt: now,
            updatedAt: now,
          })
          .returning({ id: currentStatus.id });
        if (!inserted) throw new Error("Failed to create current_status");
        statusId = inserted.id;
      }

      await tx
        .delete(currentStatusMoods)
        .where(eq(currentStatusMoods.currentStatusId, statusId));
      if (data.moodIds.length > 0) {
        await tx.insert(currentStatusMoods).values(
          data.moodIds.map((moodId) => ({
            currentStatusId: statusId,
            moodId,
          })),
        );
      }

      await tx
        .delete(currentStatusLookingFor)
        .where(eq(currentStatusLookingFor.currentStatusId, statusId));
      if (data.lookingForIds.length > 0) {
        await tx.insert(currentStatusLookingFor).values(
          data.lookingForIds.map((lookingForId) => ({
            currentStatusId: statusId,
            lookingForId,
          })),
        );
      }
    });
  },
};
