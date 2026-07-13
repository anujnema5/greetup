import { inArray, sql } from "drizzle-orm";
import { promptQuestions } from "@/core/database/schema";
import { PROMPT_QUESTIONS_SEED, RETIRED_PROMPT_QUESTION_KEYS } from "./prompt-questions.data";
import type { SeedDb } from "./seed-db";

/**
 * Upserts prompt questions by key.
 * Safe to re-run — existing user answers are never touched.
 */
export async function upsertPromptQuestions(db: SeedDb): Promise<void> {
  await db
    .insert(promptQuestions)
    .values([...PROMPT_QUESTIONS_SEED])
    .onConflictDoUpdate({
      target: promptQuestions.key,
      set: {
        question: sql`excluded.question`,
        order: sql`excluded.order`,
        isActive: sql`true`,
        updatedAt: sql`now()`,
      },
    });

  if (RETIRED_PROMPT_QUESTION_KEYS.length > 0) {
    await db
      .update(promptQuestions)
      .set({ isActive: false, updatedAt: sql`now()` })
      .where(inArray(promptQuestions.key, [...RETIRED_PROMPT_QUESTION_KEYS]));
  }
}
