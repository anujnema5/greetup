import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/session-room-redis.service";

/**
 * Aligns `rooms.is_expired` with wall-clock for one circle (`expires_at` past, or scheduled + join
 * grace missed). List-circles runs a bulk sync; this covers GET `/room`, join, and RTC token when
 * the client never hit the list endpoint.
 */
export async function syncCircleRoomExpiryFromClockIfDue(roomId: string): Promise<void> {
  const did = await roomsRepository.syncCircleRoomExpiryIfPastDue(roomId);
  if (did) await deleteSessionRoomRedis(roomId);
}
