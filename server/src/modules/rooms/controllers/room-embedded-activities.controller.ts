import type { Context } from "hono";

import { getRoomEmbeddedActivitiesCatalog } from "@/modules/rooms/services/room-embedded-activities.service";
import { ApiResponse, internalError } from "@/shared/responses";

/**
 * GET /api/room/embedded-activities
 *
 * Authenticated. Returns every `room_embedded_activities` row so the client can build the Activities
 * grid (`is_active`) and resolve call-shell policy for all known slugs.
 */
export const handleListRoomEmbeddedActivities = async (c: Context) => {
  try {
    const rows = await getRoomEmbeddedActivitiesCatalog();
    return c.json(ApiResponse.success(rows, "OK", 200), 200);
  } catch (error: unknown) {
    return internalError(c, error);
  }
};