import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";

export type HostEndCircleForEveryoneErrorCode = "ROOM_NOT_FOUND" | "NOT_HOST" | "INVALID_STATE";

export class HostEndCircleForEveryoneError extends Error {
  constructor(
    message: string,
    public readonly code: HostEndCircleForEveryoneErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "HostEndCircleForEveryoneError";
  }
}

/**
 * Host-only: disconnects everyone, clears main `room:{id}` Redis, updates Postgres, and tears down SFU.
 * Scheduled calendar circles may return to `scheduled` (slot preserved) via {@link endLiveRoomSession}.
 */
export async function hostEndCircleForEveryoneService(
  userId: string,
  roomId: string,
): Promise<{ roomEnded: boolean; alreadyEnded: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "circle") {
    throw new HostEndCircleForEveryoneError("Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.hostUserId !== userId) {
    throw new HostEndCircleForEveryoneError(
      "Only the host can end this circle for everyone",
      "NOT_HOST",
      403,
    );
  }

  if (isDbRoomSessionClosed(room)) {
    await deleteSessionRoomRedis(roomId);
    await clearUserActiveRtcRoom(userId);
    return { roomEnded: false, alreadyEnded: true };
  }

  if (room.status !== "live") {
    throw new HostEndCircleForEveryoneError("Room is not live", "INVALID_STATE", 400);
  }

  const result = await endLiveRoomSession(roomId, "host_end_for_everyone", {
    preserveScheduledSlot: room.scheduledStartAt != null,
    notifyParticipants: true,
    excludeUserIdFromNotify: userId,
  });

  await clearUserActiveRtcRoom(userId);

  return {
    roomEnded: result.ended,
    alreadyEnded: result.alreadyClosed,
  };
}
