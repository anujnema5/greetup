import { sql } from "drizzle-orm";

import { activities } from "@/core/database/schema";

import { SESSION_ACTIVITY_SEED } from "./session-activities.data";
import type { SeedDb } from "./seed-db";

/**
 * Upserts session activity catalog rows by `name`.
 * Safe to re-run in production without deleting user-selected relations.
 */
export async function upsertSessionActivities(db: SeedDb): Promise<void> {
  await db
    .insert(activities)
    .values(SESSION_ACTIVITY_SEED)
    .onConflictDoUpdate({
      target: activities.name,
      set: {
        displayName: sql`excluded.display_name`,
        description: sql`excluded.description`,
        emoji: sql`excluded.emoji`,
        detailMode: sql`excluded.detail_mode`,
        detailLabel: sql`excluded.detail_label`,
        detailPlaceholder: sql`excluded.detail_placeholder`,
        detailMaxLength: sql`excluded.detail_max_length`,
        sortOrder: sql`excluded.sort_order`,
        isActive: sql`excluded.is_active`,
        allowInMatchPrep: sql`excluded.allow_in_match_prep`,
        allowInSpace: sql`excluded.allow_in_space`,
        detailRequired: sql`excluded.detail_required`,
        updatedAt: sql`now()`,
      },
    });
}
