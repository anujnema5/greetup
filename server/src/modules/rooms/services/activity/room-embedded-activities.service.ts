import type { InferSelectModel } from "drizzle-orm";

import { roomEmbeddedActivities } from "@/core/database/schema";
import { listRoomEmbeddedActivities as listRoomEmbeddedActivitiesFromDb } from "@/modules/rooms/repositories/room-embedded-activities.repository";

export type RoomEmbeddedActivityRow = InferSelectModel<typeof roomEmbeddedActivities>;

/**
 * Full catalog for `GET /api/room/embedded-activities` (active + inactive rows, ordered for UI).
 */
export async function getRoomEmbeddedActivitiesCatalog(): Promise<RoomEmbeddedActivityRow[]> {
  return listRoomEmbeddedActivitiesFromDb();
}
