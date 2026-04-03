import { sql } from "drizzle-orm";

import { db } from "@/core/database";
import { roomCategories } from "@/core/database/schema";

import { ROOM_CATEGORY_SEED } from "./room-categories.data";

/**
 * Inserts or updates rows by `slug`. No duplicate slugs; re-runs refresh labels/metadata.
 */
export async function upsertRoomCategories(): Promise<void> {
  await db
    .insert(roomCategories)
    .values([...ROOM_CATEGORY_SEED])
    .onConflictDoUpdate({
      target: roomCategories.slug,
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
