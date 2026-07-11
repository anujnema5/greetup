import { eq, inArray, sql } from "drizzle-orm";
import {
  goals,
  interests,
  professions,
  moods,
  lookingForOptions,
} from "@/core/database/schema";

import {
  GOAL_SEED,
  INTEREST_SEED,
  LOOKING_FOR_OPTION_SEED,
  MOOD_SEED,
  PROFESSION_SEED,
  RETIRED_GOAL_NAMES,
} from "./onboarding-lookups.data";
import type { SeedDb } from "./seed-db";

/**
 * Upserts rows by name for onboarding lookup tables.
 * Safe to re-run in production without deleting user-selected relations.
 */
export async function upsertOnboardingLookups(db: SeedDb): Promise<void> {
  // Tables with unique(name): use conflict upsert.
  await db
    .insert(goals)
    .values(GOAL_SEED)
    .onConflictDoUpdate({
      target: goals.name,
      set: {
        displayName: sql`excluded.display_name`,
        description: sql`excluded.description`,
        emoji: sql`excluded.emoji`,
        isActive: sql`excluded.is_active`,
      },
    });

  if (RETIRED_GOAL_NAMES.length > 0) {
    await db
      .update(goals)
      .set({ isActive: "no" })
      .where(inArray(goals.name, [...RETIRED_GOAL_NAMES]));
  }

  await db
    .insert(moods)
    .values(MOOD_SEED)
    .onConflictDoUpdate({
      target: moods.name,
      set: {
        displayName: sql`excluded.display_name`,
        description: sql`excluded.description`,
      },
    });

  await db
    .insert(lookingForOptions)
    .values(LOOKING_FOR_OPTION_SEED)
    .onConflictDoUpdate({
      target: lookingForOptions.name,
      set: {
        displayName: sql`excluded.display_name`,
        description: sql`excluded.description`,
      },
    });

  // Tables without unique(name): update existing rows by name or insert when missing.
  for (const row of INTEREST_SEED) {
    const existing = await db.query.interests.findFirst({
      where: eq(interests.name, row.name),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(interests)
        .set({
          displayName: row.displayName,
          category: row.category,
          emoji: row.emoji ?? null,
          isActive: row.isActive,
        })
        .where(eq(interests.id, existing.id));
      continue;
    }

    await db.insert(interests).values(row);
  }

  for (const row of PROFESSION_SEED) {
    const existing = await db.query.professions.findFirst({
      where: eq(professions.name, row.name),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(professions)
        .set({
          displayName: row.displayName,
          category: row.category,
          isActive: row.isActive,
        })
        .where(eq(professions.id, existing.id));
      continue;
    }

    await db.insert(professions).values(row);
  }
}
