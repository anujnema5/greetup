import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  currentStatus,
  profileGoals,
  profileInterests,
  profileProfessions,
  userLocations,
  userPhotos,
  users,
} from "@/core/database/schema";

function mapPublicLocation(
  loc:
    | {
        city: string | null;
        region: string | null;
        country: string | null;
        countryCode: string | null;
        isPublic: boolean | null;
      }
    | null
    | undefined,
) {
  if (!loc || loc.isPublic !== true) {
    return null;
  }
  return {
    city: loc.city ?? null,
    region: loc.region ?? null,
    country: loc.country ?? null,
    countryCode: loc.countryCode ?? null,
  };
}

export const publicProfileRepository = {
  findPublicProfileTargetByUsername(username: string) {
    return db.query.users.findFirst({
      where: eq(users.username, username),
      columns: {
        id: true,
        name: true,
        displayName: true,
        image: true,
        isBanned: true,
        username: true,
      },
      with: {
        profile: {
          columns: {
            id: true,
            bio: true,
            age: true,
            gender: true,
            purpose: true,
            educationLevel: true,
            profession: true,
            personalityTags: true,
          },
        },
      },
    });
  },

  async findProfileExtras(profileId: string) {
    const [photoRows, locRow, goalRows, interestRows, professionRows, statusRow] =
      await Promise.all([
        db.query.userPhotos.findMany({
          where: eq(userPhotos.profileId, profileId),
          columns: { id: true, photoUrl: true, order: true, isVerified: true },
          orderBy: (p, { asc: a }) => [a(p.order), a(p.createdAt)],
        }),
        db.query.userLocations.findFirst({
          where: eq(userLocations.profileId, profileId),
          columns: {
            city: true,
            region: true,
            country: true,
            countryCode: true,
            isPublic: true,
          },
        }),
        db.query.profileGoals.findMany({
          where: eq(profileGoals.profileId, profileId),
          with: {
            goal: { columns: { id: true, displayName: true } },
          },
        }),
        db.query.profileInterests.findMany({
          where: eq(profileInterests.profileId, profileId),
          with: {
            interest: { columns: { id: true, displayName: true, category: true } },
          },
        }),
        db.query.profileProfessions.findMany({
          where: eq(profileProfessions.profileId, profileId),
          with: {
            profession: { columns: { id: true, displayName: true, category: true } },
          },
        }),
        db.query.currentStatus.findFirst({
          where: eq(currentStatus.profileId, profileId),
          columns: { sessionGoal: true },
          with: {
            moods: {
              with: {
                mood: { columns: { displayName: true } },
              },
            },
          },
        }),
      ]);

    const goals = goalRows
      .map((row) => row.goal)
      .filter((g): g is NonNullable<typeof g> => Boolean(g?.id && g.displayName))
      .map((g) => ({ id: g.id, displayName: g.displayName }));

    const interests = interestRows
      .map((row) => row.interest)
      .filter((i): i is NonNullable<typeof i> => Boolean(i?.id && i.displayName))
      .map((i) => ({
        id: i.id,
        displayName: i.displayName,
        category: i.category,
      }));

    const professions = professionRows
      .map((row) => row.profession)
      .filter((p): p is NonNullable<typeof p> => Boolean(p?.id && p.displayName))
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        category: p.category,
      }));

    const moods =
      statusRow?.moods
        ?.map((m) => m.mood?.displayName)
        .filter((d): d is string => Boolean(d?.trim()))
        .map((displayName) => ({ displayName })) ?? [];

    const photos = photoRows.map((p) => ({
      id: p.id,
      url: p.photoUrl,
      order: p.order,
      isVerified: p.isVerified,
    }));

    return {
      photos,
      location: mapPublicLocation(locRow),
      goals,
      interests,
      professions,
      sessionGoal: statusRow?.sessionGoal?.trim() || null,
      moods,
    };
  },
};
