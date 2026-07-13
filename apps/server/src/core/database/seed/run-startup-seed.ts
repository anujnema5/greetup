import { sql } from "drizzle-orm";

import { db } from "@/core/database";
import {
  goals,
  interests,
  lookingForOptions,
  moods,
  professions,
  promptQuestions,
} from "@/core/database/schema";
import logger from "@/core/logging";

import { upsertOnboardingLookups } from "./upsert-onboarding-lookups";
import { upsertPromptQuestions } from "./upsert-prompt-questions";
import { upsertRoomCategories } from "./upsert-room-categories";
import { upsertRoomEmbeddedActivities } from "./upsert-room-embedded-activities";
import { upsertSessionActivities } from "./upsert-session-activities";

async function countRows(
  table:
    | typeof goals
    | typeof interests
    | typeof professions
    | typeof moods
    | typeof lookingForOptions
    | typeof promptQuestions,
): Promise<number> {
  const rows = await db.select({ count: sql<number>`count(*)` }).from(table);
  return Number(rows[0]?.count ?? 0);
}

export async function runStartupSeed(): Promise<void> {
  logger.info("[seed] Starting startup seed upsert...");

  await upsertOnboardingLookups(db);
  await upsertPromptQuestions(db);
  await upsertRoomCategories();
  await upsertRoomEmbeddedActivities();
  await upsertSessionActivities(db);

  const [goalCount, interestCount, professionCount, moodCount, lookingForCount, promptCount] =
    await Promise.all([
      countRows(goals),
      countRows(interests),
      countRows(professions),
      countRows(moods),
      countRows(lookingForOptions),
      countRows(promptQuestions),
    ]);

  logger.info("[seed] Startup seed complete.", {
    goals: goalCount,
    interests: interestCount,
    professions: professionCount,
    moods: moodCount,
    lookingForOptions: lookingForCount,
    promptQuestions: promptCount,
  });
}
