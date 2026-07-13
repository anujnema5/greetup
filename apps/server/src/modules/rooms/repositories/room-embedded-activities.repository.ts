import { asc } from "drizzle-orm";

import { db } from "@/core/database";
import { roomEmbeddedActivities } from "@/core/database/schema";

/** Data access only — HTTP layer should call `getRoomEmbeddedActivitiesCatalog` in the service. */
export async function listRoomEmbeddedActivities() {
  return db
    .select()
    .from(roomEmbeddedActivities)
    .orderBy(asc(roomEmbeddedActivities.sortOrder), asc(roomEmbeddedActivities.slug));
}
