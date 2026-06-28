import { asc, eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  currentStatus,
  currentStatusActivities,
  currentStatusMoods,
  profileInterests,
  userProfiles,
} from "@/core/database/schema";
import type { ValidatedActivitySelection } from "@/modules/session-activities";
import type { OpenToConnectSource } from "../types";

export const openToConnectStatusRepository = {
  async findByUserId(userId: string) {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: { id: true },
    });
    if (!profile) return null;

    return db.query.currentStatus.findFirst({
      where: eq(currentStatus.profileId, profile.id),
      columns: {
        id: true,
        profileId: true,
        openToConnect: true,
        openToConnectUpdatedAt: true,
        openToConnectSource: true,
        openToConnectHeadline: true,
        openToConnectPausedForRoom: true,
      },
      with: {
        moods: {
          columns: { moodId: true },
        },
        activities: {
          orderBy: [asc(currentStatusActivities.sortOrder)],
          columns: { activityId: true },
        },
      },
    });
  },

  async setOpenState(
    profileId: string,
    data: {
      openToConnect: boolean;
      source: OpenToConnectSource | null;
      headline: string | null;
    },
  ) {
    const now = new Date();
    const existing = await db.query.currentStatus.findFirst({
      where: eq(currentStatus.profileId, profileId),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(currentStatus)
        .set({
          openToConnect: data.openToConnect,
          openToConnectUpdatedAt: data.openToConnect ? now : null,
          openToConnectSource: data.openToConnect ? data.source : null,
          openToConnectHeadline: data.openToConnect ? data.headline : null,
          openToConnectPausedForRoom: false,
          updatedAt: now,
        })
        .where(eq(currentStatus.id, existing.id));
      return;
    }

    await db.insert(currentStatus).values({
      profileId,
      openToConnect: data.openToConnect,
      openToConnectUpdatedAt: data.openToConnect ? now : null,
      openToConnectSource: data.openToConnect ? data.source : null,
      openToConnectHeadline: data.openToConnect ? data.headline : null,
      openToConnectPausedForRoom: false,
      availability: "available",
      lastActiveAt: now,
      updatedAt: now,
    });
  },

  async replaceActivities(
    currentStatusId: string,
    activitySelections: ValidatedActivitySelection[],
  ) {
    await db.transaction(async (tx) => {
      await tx
        .delete(currentStatusActivities)
        .where(eq(currentStatusActivities.currentStatusId, currentStatusId));
      if (activitySelections.length === 0) return;
      await tx.insert(currentStatusActivities).values(
        activitySelections.map((row) => ({
          currentStatusId: currentStatusId,
          activityId: row.activityId,
          detail: row.detail,
          detailNormalized: row.detailNormalized,
          sortOrder: row.sortOrder,
        })),
      );
    });
  },

  async listInterestIdsForProfile(profileId: string): Promise<string[]> {
    const rows = await db.query.profileInterests.findMany({
      where: eq(profileInterests.profileId, profileId),
      columns: { interestId: true },
    });
    return rows.map((row) => row.interestId);
  },

  async setPausedForRoom(profileId: string, paused: boolean): Promise<void> {
    const now = new Date();
    await db
      .update(currentStatus)
      .set({
        openToConnectPausedForRoom: paused,
        updatedAt: now,
      })
      .where(eq(currentStatus.profileId, profileId));
  },

  async listMoodIdsForStatus(currentStatusId: string): Promise<string[]> {
    const rows = await db.query.currentStatusMoods.findMany({
      where: eq(currentStatusMoods.currentStatusId, currentStatusId),
      columns: { moodId: true },
    });
    return rows.map((row) => row.moodId);
  },
};
