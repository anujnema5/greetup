/**
 * Profile setup repository – save profile data per step.
 */

import { db } from "@/core/database";
import {
  users,
  userProfiles,
  userLocations,
  userSocials,
  userPromptAnswers,
  profileGoals,
  profileInterests,
  profileProfessions,
  profilePreferences,
  userPhotos,
} from "@/core/database/schema";
import { eq, sql } from "drizzle-orm";

import { openToConnectStatusRepository } from "@/modules/open-to-connect/repositories/open-to-connect-status.repository";

export class UsernameTakenError extends Error {
  constructor() {
    super("USERNAME_TAKEN");
    this.name = "UsernameTakenError";
  }
}

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
    await openToConnectStatusRepository.createInitialForProfile(inserted.id, true);
    return inserted.id;
  },

  async updateUserDisplayName(userId: string, displayName: string) {
    // Keep `name` in sync so auth session payloads show the same label everywhere.
    return db.update(users).set({ displayName, name: displayName }).where(eq(users.id, userId));
  },

  async isUsernameTakenByOther(userId: string, username: string): Promise<boolean> {
    const taken = await db.query.users.findFirst({
      where: eq(users.username, username),
      columns: { id: true },
    });
    return Boolean(taken && taken.id !== userId);
  },

  async setUsername(userId: string, username: string) {
    if (await this.isUsernameTakenByOther(userId, username)) {
      throw new UsernameTakenError();
    }
    return db.update(users).set({ username }).where(eq(users.id, userId));
  },

  /** Syncs Better Auth session `user.image` (get-session) with the profile’s primary photo URL. */
  async updateUserImage(userId: string, image: string | null) {
    return db
      .update(users)
      .set({ image, updatedAt: new Date() })
      .where(eq(users.id, userId));
  },

  async getUsername(userId: string): Promise<string | null> {
    const row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { username: true },
    });
    return row?.username ?? null;
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
    data: {
      country: string;
      countryCode: string;
      region?: string;
      regionCode?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      source?: string;
    }
  ) {
    const existing = await db.query.userLocations.findFirst({
      where: (loc, { eq }) => eq(loc.profileId, profileId),
    });

    const payload: Record<string, unknown> = {
      country: data.country,
      countryCode: data.countryCode,
      updatedAt: new Date(),
    };
    if (data.region !== undefined) payload.region = data.region;
    if (data.regionCode !== undefined) payload.regionCode = data.regionCode;
    if (data.city !== undefined) payload.city = data.city;
    if (data.latitude !== undefined) payload.latitude = data.latitude;
    if (data.longitude !== undefined) payload.longitude = data.longitude;
    if (data.source !== undefined) payload.source = data.source;
    if (data.latitude != null && data.longitude != null) {
      payload.location = sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)`;
    }

    if (existing) {
      return db
        .update(userLocations)
        .set(payload)
        .where(eq(userLocations.profileId, profileId));
    }

    return db.insert(userLocations).values({
      profileId,
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      regionCode: data.regionCode,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      source: data.source,
      location:
        data.latitude != null && data.longitude != null
          ? sql`ST_SetSRID(ST_MakePoint(${data.longitude}, ${data.latitude}), 4326)`
          : undefined,
    });
  },

  async upsertSocials(
    profileId: string,
    data: { instagram?: string; twitter?: string }
  ) {
    const existing = await db.query.userSocials.findFirst({
      where: (s, { eq }) => eq(s.profileId, profileId),
    });

    const payload: Record<string, unknown> = { updatedAt: new Date() };
    if (data.instagram !== undefined) payload.instagram = data.instagram || null;
    if (data.twitter !== undefined) payload.twitter = data.twitter || null;

    if (existing) {
      return db
        .update(userSocials)
        .set(payload)
        .where(eq(userSocials.profileId, profileId));
    }

    return db.insert(userSocials).values({
      profileId,
      instagram: data.instagram || null,
      twitter: data.twitter || null,
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
      distancePreference?:
        | "nearby"
        | "same city"
        | "same country"
        | "random"
        | "global"
        | "same_city"
        | "same_country";
      locationPreferenceEnabled?: boolean;
      minAge?: number;
      maxAge?: number;
    }
  ) {
    const existing = await db.query.profilePreferences.findFirst({
      where: (p, { eq }) => eq(p.profileId, profileId),
    });

    const normalizedDistancePreference =
      data.distancePreference === "same_city"
        ? "same city"
        : data.distancePreference === "same_country"
          ? "same country"
          : data.distancePreference;

    const payload: Record<string, unknown> = {
      ...data,
      distancePreference: normalizedDistancePreference,
    };
    if (typeof payload.distancePreference === "string") {
      const normalized = payload.distancePreference.toLowerCase().trim();
      if (normalized === "same_city") payload.distancePreference = "same city";
      if (normalized === "same_country") payload.distancePreference = "same country";
    }
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
        distancePreference: normalizedDistancePreference ?? "random",
        locationPreferenceEnabled: data.locationPreferenceEnabled ?? false,
        minAge: data.minAge ?? 18,
        maxAge: data.maxAge ?? 99,
      });
    }
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

  /**
   * Upserts free-text answers for prompt questions.
   * Only provided answers are written — unanswered questions are left untouched.
   */
  async replacePromptAnswers(
    profileId: string,
    answers: Array<{ questionId: string; answer: string }>,
  ) {
    if (answers.length === 0) return;

    for (const { questionId, answer } of answers) {
      await db
        .insert(userPromptAnswers)
        .values({ profileId, questionId, answer })
        .onConflictDoUpdate({
          target: [userPromptAnswers.profileId, userPromptAnswers.questionId],
          set: { answer, updatedAt: new Date() },
        });
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
