import logger from "@/core/logging";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";

export type HostEndSpaceForEveryoneErrorCode = "ROOM_NOT_FOUND" | "NOT_HOST" | "INVALID_STATE";

export class HostEndSpaceForEveryoneError extends Error {
  constructor(
    message: string,
    public readonly code: HostEndSpaceForEveryoneErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "HostEndSpaceForEveryoneError";
  }
}

function rejectHostEndSpace(
  userId: string,
  roomId: string,
  message: string,
  code: HostEndSpaceForEveryoneErrorCode,
  statusCode: number,
): never {
  logger.warn("space_host_end_rejected", { userId, roomId, code, message });
  throw new HostEndSpaceForEveryoneError(message, code, statusCode);
}

/**
 * Host-only: disconnects everyone, clears main `room:{id}` Redis, updates Postgres, and tears down SFU.
 * Scheduled calendar spaces may return to `scheduled` (slot preserved) via {@link endLiveRoomSession}.
 */
export async function hostEndSpaceForEveryoneService(
  userId: string,
  roomId: string,
): Promise<{ roomEnded: boolean; alreadyEnded: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "space") {
    rejectHostEndSpace(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.hostUserId !== userId) {
    rejectHostEndSpace(
      userId,
      roomId,
      "Only the host can end this space for everyone",
      "NOT_HOST",
      403,
    );
  }

  if (isDbRoomSessionClosed(room)) {
    await deleteSessionRoomRedis(roomId);
    await clearUserActiveRtcRoom(userId);
    logger.debug("space_host_end_skipped", { userId, roomId, reason: "already_ended" });
    return { roomEnded: false, alreadyEnded: true };
  }

  if (room.status !== "live") {
    rejectHostEndSpace(userId, roomId, "Room is not live", "INVALID_STATE", 400);
  }

  const result = await endLiveRoomSession(roomId, "host_end_for_everyone", {
    preserveScheduledSlot: room.scheduledStartAt != null,
    notifyParticipants: true,
    excludeUserIdFromNotify: userId,
  });

  await clearUserActiveRtcRoom(userId);

  logger.info("space_host_ended_for_everyone", {
    userId,
    roomId,
    roomEnded: result.ended,
    alreadyClosed: result.alreadyClosed,
  });
  return {
    roomEnded: result.ended,
    alreadyEnded: result.alreadyClosed,
  };
}
