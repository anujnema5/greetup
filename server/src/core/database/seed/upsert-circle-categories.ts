import { sql } from "drizzle-orm";

import { db } from "@/core/database";
import { circleCategories } from "@/core/database/schema";

import { CIRCLE_CATEGORY_SEED } from "./circle-categories.data";

/**
 * Inserts or updates rows by `slug`. No duplicate slugs; re-runs refresh labels/metadata.
 */
export async function upsertCircleCategories(): Promise<void> {
  await db
    .insert(circleCategories)
    .values([...CIRCLE_CATEGORY_SEED])
    .onConflictDoUpdate({
      target: circleCategories.slug,
      set: {
        displayName: sql`excluded.display_name`,
        description: sql`excluded.description`,
        emoji: sql`excluded.emoji`,
        sortOrder: sql`excluded.sort_order`,
        isActive: sql`excluded.is_active`,
        updatedAt: sql`now()`,
      },
    });
}
