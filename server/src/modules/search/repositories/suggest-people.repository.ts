import { and, asc, eq, inArray, isNotNull, notInArray } from "drizzle-orm";

import { db } from "@/core/database";
import {
  profileGoals,
  profileInterests,
  profileProfessions,
  userProfiles,
  users,
} from "@/core/database/schema";
import { profileStepsRepository } from "@/modules/profile/repositories/profile-steps.repository";

export type ViewerProfileSignalsRow = {
  profileId: string;
  interestIds: string[];
  goalIds: string[];
  professionId: string | null;
  interestLabelsById: Map<string, string>;
};

export type SuggestPeopleCandidateRow = {
  userId: string;
  profileId: string;
  username: string;
  displayName: string | null;
  name: string;
  image: string | null;
  bio: string | null;
};

export const suggestPeopleRepository = {
  async loadViewerSignals(userId: string): Promise<ViewerProfileSignalsRow | null> {
    const profile = await profileStepsRepository.getProfileForSteps(userId);
    if (!profile) return null;

    const interestLabelsById = new Map<string, string>();
    const interestIds: string[] = [];
    for (const row of profile.interests ?? []) {
      const id = row.interest.id;
      interestIds.push(id);
      interestLabelsById.set(id, row.interest.displayName);
    }

    return {
      profileId: profile.id,
      interestIds,
      goalIds: (profile.goals ?? []).map((g) => g.goal.id),
      professionId: profile.professions?.[0]?.profession?.id ?? null,
      interestLabelsById,
    };
  },

  async findCandidatesBySharedInterests(
    viewerId: string,
    viewerInterestIds: string[],
    excludedUserIds: string[],
    fetchLimit: number,
  ): Promise<SuggestPeopleCandidateRow[]> {
    if (viewerInterestIds.length === 0) return [];

    const exclude = [...new Set([viewerId, ...excludedUserIds])];

    const conditions = [
      inArray(profileInterests.interestId, viewerInterestIds),
      eq(users.isBanned, "no"),
      isNotNull(users.username),
      eq(userProfiles.isOnboarded, true),
    ];

    if (exclude.length > 0) {
      conditions.push(notInArray(users.id, exclude));
    }

    const rows = await db
      .selectDistinctOn([users.id], {
        userId: users.id,
        profileId: userProfiles.id,
        username: users.username,
        displayName: users.displayName,
        name: users.name,
        image: users.image,
        bio: userProfiles.bio,
      })
      .from(profileInterests)
      .innerJoin(userProfiles, eq(profileInterests.profileId, userProfiles.id))
      .innerJoin(users, eq(userProfiles.userId, users.id))
      .where(and(...conditions))
      .orderBy(asc(users.id))
      .limit(fetchLimit);

    return rows
      .filter((r): r is SuggestPeopleCandidateRow & { username: string } => r.username != null)
      .map((r) => ({
        userId: r.userId,
        profileId: r.profileId,
        username: r.username,
        displayName: r.displayName,
        name: r.name,
        image: r.image,
        bio: r.bio,
      }));
  },

  async loadSignalsByProfileIds(profileIds: string[]) {
    if (profileIds.length === 0) {
      return new Map<
        string,
        {
          interestIds: string[];
          goalIds: string[];
          professionId: string | null;
          professionDisplayName: string | null;
          interestLabelsById: Map<string, string>;
        }
      >();
    }

    const [interestRows, goalRows, professionRows] = await Promise.all([
      db.query.profileInterests.findMany({
        where: inArray(profileInterests.profileId, profileIds),
        with: {
          interest: { columns: { id: true, displayName: true } },
        },
      }),
      db.query.profileGoals.findMany({
        where: inArray(profileGoals.profileId, profileIds),
        with: {
          goal: { columns: { id: true } },
        },
      }),
      db.query.profileProfessions.findMany({
        where: inArray(profileProfessions.profileId, profileIds),
        with: {
          profession: { columns: { id: true, displayName: true } },
        },
      }),
    ]);

    const map = new Map<
      string,
      {
        interestIds: string[];
        goalIds: string[];
        professionId: string | null;
        professionDisplayName: string | null;
        interestLabelsById: Map<string, string>;
      }
    >();

    for (const id of profileIds) {
      map.set(id, {
        interestIds: [],
        goalIds: [],
        professionId: null,
        professionDisplayName: null,
        interestLabelsById: new Map(),
      });
    }

    for (const row of interestRows) {
      const entry = map.get(row.profileId);
      if (!entry) continue;
      entry.interestIds.push(row.interest.id);
      entry.interestLabelsById.set(row.interest.id, row.interest.displayName);
    }

    for (const row of goalRows) {
      const entry = map.get(row.profileId);
      if (!entry) continue;
      entry.goalIds.push(row.goal.id);
    }

    for (const row of professionRows) {
      const entry = map.get(row.profileId);
      if (!entry || entry.professionId) continue;
      entry.professionId = row.profession.id;
      entry.professionDisplayName = row.profession.displayName;
    }

    return map;
  },
};
