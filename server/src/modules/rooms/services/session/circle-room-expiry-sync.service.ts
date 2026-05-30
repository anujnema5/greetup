import logger from "@/core/logging";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";

/**
 * Aligns `rooms.is_expired` with wall-clock for one circle (`expires_at` past, or scheduled + join
 * grace missed). List-circles runs a bulk sync; this covers GET `/room`, join, and RTC token when
 * the client never hit the list endpoint.
 */
export async function syncCircleRoomExpiryFromClockIfDue(roomId: string): Promise<void> {
  const did = await roomSessionsRepository.syncCircleRoomExpiryIfPastDue(roomId);
  if (did) {
    await deleteSessionRoomRedis(roomId);
    logger.debug("circle_room_expiry_synced", { roomId });
  } else {
    logger.debug("circle_room_expiry_sync_skipped", { roomId });
  }
}
