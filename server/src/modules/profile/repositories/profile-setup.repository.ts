/**
 * Profile setup repository – save profile data per step.
 */

import { db } from "@/core/database";
import {
  users,
  userProfiles,
  userLocations,
  profileGoals,
  profileInterests,
  profileProfessions,
  profilePreferences,
  profileConnectionTypes,
  userPhotos,
} from "@/core/database/schema";
import { eq } from "drizzle-orm";

export const profileSetupRepository = {
  /**
   * Get or create user profile. Returns profileId.
   */
  async getOrCreateProfile(userId: string): Promise<string> {
    const existing = await db.query.userProfiles.findFirst({
      where: (p, { eq }) => eq(p.userId, userId),
      columns: { id: true },
    });

    if (existing) return existing.id;

    const [inserted] = await db
      .insert(userProfiles)
      .values({ userId })
      .returning({ id: userProfiles.id });
    if (!inserted) throw new Error("Failed to create profile");
    return inserted.id;
  },

  async updateUserDisplayName(userId: string, displayName: string) {
    return db.update(users).set({ displayName }).where(eq(users.id, userId));
  },

  async updateBasicProfile(
    profileId: string,
    data: Partial<{
      age: number;
      gender: string;
      bio: string;
      profession: string;
      profileCompletion: number;
    }>
  ) {
    return db
      .update(userProfiles)
      .set(data)
      .where(eq(userProfiles.id, profileId));
  },

  async upsertLocation(
    profileId: string,
    data: { country: string; countryCode: string }
  ) {
    const existing = await db.query.userLocations.findFirst({
      where: (loc, { eq }) => eq(loc.profileId, profileId),
    });

    if (existing) {
      return db
        .update(userLocations)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userLocations.profileId, profileId));
    }

    return db.insert(userLocations).values({
      profileId,
      country: data.country,
      countryCode: data.countryCode,
    });
  },

  async replaceGoals(profileId: string, goalIds: string[]) {
    await db.delete(profileGoals).where(eq(profileGoals.profileId, profileId));
    if (goalIds.length > 0) {
      await db.insert(profileGoals).values(
        goalIds.map((goalId) => ({ profileId, goalId }))
      );
    }
  },

  async replaceInterests(profileId: string, interestIds: string[]) {
    await db
      .delete(profileInterests)
      .where(eq(profileInterests.profileId, profileId));
    if (interestIds.length > 0) {
      await db.insert(profileInterests).values(
        interestIds.map((interestId) => ({ profileId, interestId }))
      );
    }
  },

  async replaceProfessions(profileId: string, professionId: string | null) {
    await db
      .delete(profileProfessions)
      .where(eq(profileProfessions.profileId, profileId));
    if (professionId) {
      await db.insert(profileProfessions).values({
        profileId,
        professionId,
      });
    }
  },

  async upsertPreferences(
    profileId: string,
    data: {
      preferredGender?: "any" | "male" | "female" | "others" | "same";
      distancePreference?: "nearby" | "same city" | "same country" | "random" | "global";
      minAge?: number;
      maxAge?: number;
    }
  ) {
    const existing = await db.query.profilePreferences.findFirst({
      where: (p, { eq }) => eq(p.profileId, profileId),
    });

    const payload: Record<string, unknown> = { ...data };
    if (Object.keys(payload).length === 0) return;

    if (existing) {
      await db
        .update(profilePreferences)
        .set({ ...payload, updatedAt: new Date() } as Record<string, unknown>)
        .where(eq(profilePreferences.profileId, profileId));
    } else {
      await db.insert(profilePreferences).values({
        profileId,
        preferredGender: data.preferredGender ?? "any",
        distancePreference: data.distancePreference ?? "random",
        minAge: data.minAge ?? 18,
        maxAge: data.maxAge ?? 99,
      });
    }
  },

  async replaceConnectionTypes(
    profilePreferenceId: string,
    connectionTypeIds: string[]
  ) {
    await db
      .delete(profileConnectionTypes)
      .where(eq(profileConnectionTypes.profilePreferenceId, profilePreferenceId));
    if (connectionTypeIds.length > 0) {
      await db.insert(profileConnectionTypes).values(
        connectionTypeIds.map((connectionTypeId) => ({
          profilePreferenceId,
          connectionTypeId,
        }))
      );
    }
  },

  async getProfilePreferenceId(profileId: string): Promise<string | null> {
    const pref = await db.query.profilePreferences.findFirst({
      where: (p, { eq }) => eq(p.profileId, profileId),
      columns: { id: true },
    });
    return pref?.id ?? null;
  },

  async ensureProfilePreference(profileId: string): Promise<string> {
    const existing = await this.getProfilePreferenceId(profileId);
    if (existing) return existing;

    const [inserted] = await db
      .insert(profilePreferences)
      .values({
        profileId,
        preferredGender: "any",
        distancePreference: "random",
        minAge: 18,
        maxAge: 99,
      })
      .returning({ id: profilePreferences.id });
    if (!inserted) throw new Error("Failed to create profile preference");
    return inserted.id;
  },

  async replacePhotos(
    profileId: string,
    photos: Array<{ url: string; order?: number }>
  ) {
    await db.delete(userPhotos).where(eq(userPhotos.profileId, profileId));
    if (photos.length > 0) {
      await db.insert(userPhotos).values(
        photos.map((p, i) => ({
          profileId,
          photoUrl: p.url,
          order: p.order ?? i,
        }))
      );
    }
  },

  async updateCompletionAndOnboarded(
    profileId: string,
    data: { profileCompletion: number; isOnboarded: boolean }
  ) {
    return db
      .update(userProfiles)
      .set({
        profileCompletion: data.profileCompletion,
        isOnboarded: data.isOnboarded,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, profileId));
  },
};
