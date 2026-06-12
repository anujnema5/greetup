import { and, eq, inArray, isNull, ne } from "drizzle-orm";

import { db } from "@/core/database";
import { currentStatus, profileInterests, userProfiles, users } from "@/core/database/schema";

import { isGuestMatchPrepReady } from "../lib/guest-match-prep-ready";

export type GuestProfileRow = {
  isGuest: boolean;
  guestTrialConsumedAt: Date | null;
  guestConvertedAt: Date | null;
  guestDeviceHash: string | null;
  guestCreatedIpHash: string | null;
  displayName: string | null;
  name: string;
};

export const guestProfileRepository = {
  async findTrialFlagsByUserId(userId: string): Promise<{
    isGuest: boolean;
    guestTrialConsumed: boolean;
  } | null> {
    const row = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: {
        isGuest: true,
        guestTrialConsumedAt: true,
      },
    });

    if (!row) {
      return null;
    }

    return {
      isGuest: row.isGuest,
      guestTrialConsumed: row.guestTrialConsumedAt != null,
    };
  },

  async anyUserIdIsGuest(userIds: string[]): Promise<boolean> {
    const normalized = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
    if (normalized.length === 0) {
      return false;
    }

    const row = await db.query.userProfiles.findFirst({
      where: and(inArray(userProfiles.userId, normalized), eq(userProfiles.isGuest, true)),
      columns: { userId: true },
    });

    return row != null;
  },

  async findByUserId(userId: string): Promise<GuestProfileRow | null> {
    const [row] = await db
      .select({
        isGuest: userProfiles.isGuest,
        guestTrialConsumedAt: userProfiles.guestTrialConsumedAt,
        guestConvertedAt: userProfiles.guestConvertedAt,
        guestDeviceHash: userProfiles.guestDeviceHash,
        guestCreatedIpHash: userProfiles.guestCreatedIpHash,
        displayName: users.displayName,
        name: users.name,
      })
      .from(userProfiles)
      .innerJoin(users, eq(userProfiles.userId, users.id))
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    return row ?? null;
  },

  async markCallTrialConsumedIfUnset(userId: string, consumedAt: Date): Promise<boolean> {
    const rows = await db
      .update(userProfiles)
      .set({
        guestTrialConsumedAt: consumedAt,
        updatedAt: consumedAt,
      })
      .where(
        and(
          eq(userProfiles.userId, userId),
          eq(userProfiles.isGuest, true),
          isNull(userProfiles.guestTrialConsumedAt),
        ),
      )
      .returning({ id: userProfiles.id });

    return rows.length > 0;
  },

  async createGuestProfile(
    userId: string,
    tracking: { deviceHash?: string | null; ipHash?: string | null },
  ): Promise<void> {
    await db.insert(userProfiles).values({
      userId,
      isGuest: true,
      isOnboarded: false,
      guestDeviceHash: tracking.deviceHash ?? null,
      guestCreatedIpHash: tracking.ipHash ?? null,
    });
  },

  async updateDisplayName(userId: string, displayName: string): Promise<void> {
    const now = new Date();
    await db
      .update(users)
      .set({
        displayName,
        name: displayName,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
  },

  async findRegisteredUserIdByEmail(
    email: string,
    excludeUserId: string,
  ): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    const row = await db.query.users.findFirst({
      where: and(eq(users.email, normalized), ne(users.id, excludeUserId)),
      columns: { id: true },
    });

    return row?.id ?? null;
  },

  async findRegisteredUserIdByPhone(
    phone: string,
    excludeUserId: string,
  ): Promise<string | null> {
    const normalized = phone.trim();
    if (!normalized) {
      return null;
    }

    const row = await db.query.users.findFirst({
      where: and(eq(users.phoneNumber, normalized), ne(users.id, excludeUserId)),
      columns: { id: true },
    });

    return row?.id ?? null;
  },

  async markGuestConverted(userId: string, convertedAt: Date): Promise<void> {
    await db
      .update(userProfiles)
      .set({
        isGuest: false,
        guestConvertedAt: convertedAt,
        updatedAt: convertedAt,
      })
      .where(and(eq(userProfiles.userId, userId), eq(userProfiles.isGuest, true)));
  },

  /** Whether mood + looking-for + interests were saved (e.g. guest match prep on `/try`). */
  async isMatchPrepReadyForUserId(userId: string): Promise<boolean> {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, userId),
      columns: { id: true },
    });
    if (!profile) {
      return false;
    }

    const [statusRow, interestRows] = await Promise.all([
      db.query.currentStatus.findFirst({
        where: eq(currentStatus.profileId, profile.id),
        columns: { id: true },
        with: {
          moods: { columns: { moodId: true } },
          lookingFor: { columns: { lookingForId: true } },
        },
      }),
      db.query.profileInterests.findMany({
        where: eq(profileInterests.profileId, profile.id),
        columns: { interestId: true },
      }),
    ]);

    return isGuestMatchPrepReady({
      moodIds: statusRow?.moods.map((row) => row.moodId) ?? [],
      lookingForIds: statusRow?.lookingFor.map((row) => row.lookingForId) ?? [],
      interestIds: interestRows.map((row) => row.interestId),
    });
  },

  async setTrackingHashes(
    userId: string,
    hashes: { deviceHash?: string | null; ipHash?: string | null },
  ): Promise<void> {
    const patch: Partial<typeof userProfiles.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (hashes.deviceHash !== undefined) {
      patch.guestDeviceHash = hashes.deviceHash;
    }
    if (hashes.ipHash !== undefined) {
      patch.guestCreatedIpHash = hashes.ipHash;
    }

    if (Object.keys(patch).length <= 1) {
      return;
    }

    await db.update(userProfiles).set(patch).where(eq(userProfiles.userId, userId));
  },
};
