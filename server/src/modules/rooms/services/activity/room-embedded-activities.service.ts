import type { InferSelectModel } from "drizzle-orm";

import { roomEmbeddedActivities } from "@/core/database/schema";
import logger from "@/core/logging";
import { listRoomEmbeddedActivities as listRoomEmbeddedActivitiesFromDb } from "@/modules/rooms/repositories/room-embedded-activities.repository";

export type RoomEmbeddedActivityRow = InferSelectModel<typeof roomEmbeddedActivities>;

/**
 * Full catalog for `GET /api/room/embedded-activities` (active + inactive rows, ordered for UI).
 */
export async function getRoomEmbeddedActivitiesCatalog(): Promise<RoomEmbeddedActivityRow[]> {
  const rows = await listRoomEmbeddedActivitiesFromDb();
  logger.debug("room_embedded_activities_listed", { count: rows.length });
  return rows;
}
