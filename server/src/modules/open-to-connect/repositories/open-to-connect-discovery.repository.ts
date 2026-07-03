import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/core/database";
import {
  currentStatus,
  currentStatusActivities,
  interests,
  profileInterests,
  profileProfessions,
  userProfiles,
  users,
} from "@/core/database/schema";
import { toSpaceActivityTagDto } from "@/modules/session-activities/activity-catalog.mapper";
import type { OpenToConnectActivityTagDto } from "../types";

export type OpenToConnectUserProfileRow = {
  userId: string;
  profileId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
};

export const openToConnectDiscoveryRepository = {
  async listViewerInterestIds(userId: string): Promise<string[]> {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: { id: true },
    });
    if (!profile) return [];
    const rows = await db.query.profileInterests.findMany({
      where: eq(profileInterests.profileId, profile.id),
      columns: { interestId: true },
    });
    return rows.map((row) => row.interestId);
  },

  async loadInterestLabelsByIds(interestIds: string[]): Promise<Map<string, string>> {
    if (interestIds.length === 0) return new Map();
    const rows = await db.query.interests.findMany({
      where: inArray(interests.id, interestIds),
      columns: { id: true, displayName: true },
    });
    return new Map(rows.map((row) => [row.id, row.displayName]));
  },

  async listViewerActivityIds(userId: string): Promise<string[]> {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: { id: true },
    });
    if (!profile) return [];
    const status = await db.query.currentStatus.findFirst({
      where: eq(currentStatus.profileId, profile.id),
      columns: { id: true },
      with: {
        activities: {
          orderBy: [asc(currentStatusActivities.sortOrder)],
          columns: { activityId: true },
        },
      },
    });
    return status?.activities.map((row) => row.activityId) ?? [];
  },

  async loadUserProfilesByUserIds(userIds: string[]): Promise<OpenToConnectUserProfileRow[]> {
    if (userIds.length === 0) return [];
    const rows = await db
      .select({
        userId: users.id,
        profileId: userProfiles.id,
        username: users.username,
        displayName: users.displayName,
        name: users.name,
        image: users.image,
      })
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(inArray(users.id, userIds));
    return rows;
  },

  async loadActivitiesByProfileIds(
    profileIds: string[],
  ): Promise<Map<string, OpenToConnectActivityTagDto[]>> {
    const out = new Map<string, OpenToConnectActivityTagDto[]>();
    if (profileIds.length === 0) return out;

    const statuses = await db.query.currentStatus.findMany({
      where: inArray(currentStatus.profileId, profileIds),
      columns: { id: true, profileId: true },
      with: {
        activities: {
          orderBy: [asc(currentStatusActivities.sortOrder)],
          columns: { detail: true },
          with: {
            activity: {
              columns: {
                id: true,
                name: true,
                displayName: true,
                emoji: true,
              },
            },
          },
        },
      },
    });

    for (const status of statuses) {
      const tags = status.activities.map((row) => toSpaceActivityTagDto(row));
      out.set(status.profileId, tags);
    }
    return out;
  },

  async loadLookingForLabelsByProfileIds(profileIds: string[]): Promise<Map<string, string[]>> {
    const out = new Map<string, string[]>();
    if (profileIds.length === 0) return out;

    const statuses = await db.query.currentStatus.findMany({
      where: inArray(currentStatus.profileId, profileIds),
      columns: { profileId: true },
      with: {
        lookingFor: {
          with: {
            lookingForOption: {
              columns: { displayName: true },
            },
          },
        },
      },
    });

    for (const status of statuses) {
      const labels = status.lookingFor
        .map((row) => row.lookingForOption.displayName.trim())
        .filter(Boolean);
      out.set(status.profileId, labels);
    }
    return out;
  },

  async loadProfessionLabelsByProfileIds(
    profileIds: string[],
  ): Promise<Map<string, string | null>> {
    const out = new Map<string, string | null>();
    if (profileIds.length === 0) return out;

    const [catalogRows, profiles] = await Promise.all([
      db.query.profileProfessions.findMany({
        where: inArray(profileProfessions.profileId, profileIds),
        with: {
          profession: {
            columns: { displayName: true },
          },
        },
      }),
      db.query.userProfiles.findMany({
        where: inArray(userProfiles.id, profileIds),
        columns: { id: true, profession: true },
      }),
    ]);

    const catalogByProfile = new Map<string, string>();
    for (const row of catalogRows) {
      const label = row.profession.displayName?.trim();
      if (label && !catalogByProfile.has(row.profileId)) {
        catalogByProfile.set(row.profileId, label);
      }
    }

    for (const profile of profiles) {
      const fromCatalog = catalogByProfile.get(profile.id);
      const legacy = profile.profession?.trim();
      out.set(profile.id, fromCatalog || legacy || null);
    }
    return out;
  },
};
