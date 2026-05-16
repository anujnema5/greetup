import { sql } from "drizzle-orm";
import { promptQuestions } from "@/core/database/schema";
import { PROMPT_QUESTIONS_SEED } from "./prompt-questions.data";
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
        updatedAt: sql`now()`,
      },
    });
}
