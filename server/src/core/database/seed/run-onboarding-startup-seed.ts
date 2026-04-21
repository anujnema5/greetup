import { sql } from "drizzle-orm";

import { db } from "@/core/database";
import {
  goals,
  interests,
  lookingForOptions,
  moods,
  professions,
} from "@/core/database/schema";
import logger from "@/core/logging";

import { upsertOnboardingLookups } from "./upsert-onboarding-lookups";

async function countRows(
  table:
    | typeof goals
    | typeof interests
    | typeof professions
    | typeof moods
    | typeof lookingForOptions,
): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)` }).from(table);
  return Number(rows[0]?.count ?? 0);
}

export async function runOnboardingStartupSeed(): Promise<void> {
  logger.info("[seed] Starting onboarding lookups upsert...");
  console.log("[seed] Starting onboarding lookups upsert...");

  await upsertOnboardingLookups(db);

  const [goalCount, interestCount, professionCount, moodCount, lookingForCount] =
    await Promise.all([
      countRows(goals),
      countRows(interests),
      countRows(professions),
      countRows(moods),
      countRows(lookingForOptions),
    ]);

  logger.info("[seed] Onboarding lookups upserted.", {
    goals: goalCount,
    interests: interestCount,
    professions: professionCount,
    moods: moodCount,
    lookingForOptions: lookingForCount,
  });
  console.log(
    `[seed] Onboarding lookups upserted. goals=${goalCount} interests=${interestCount} professions=${professionCount} moods=${moodCount} lookingForOptions=${lookingForCount}`,
  );
}
