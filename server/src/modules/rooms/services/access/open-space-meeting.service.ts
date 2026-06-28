import logger from "@/core/logging";
import { isScheduledSpaceBeforeStartTime } from "@/modules/rooms/lib/session/scheduled-space-lobby";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";
import { roomsRepository } from "../../repositories/rooms.repository";
import { emitSpaceOpenedForJoin } from "@/modules/rooms/socket/space-room-socket.handler";
import { clearSpaceLobbyGateInRedis } from "../rtc/session-room-redis.service";

export type OpenSpaceMeetingErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_HOST"
  | "INVALID_STATE"
  | "LOBBY_NOT_READY"
  | "SESSION_NOT_READY";

export class OpenSpaceMeetingError extends Error {
  constructor(
    message: string,
    public readonly code: OpenSpaceMeetingErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "OpenSpaceMeetingError";
  }
}

function rejectOpenSpaceMeeting(
  userId: string,
  roomId: string,
  message: string,
  code: OpenSpaceMeetingErrorCode,
  statusCode: number,
): never {
  logger.warn("space_meeting_open_rejected", { userId, roomId, code, message });
  throw new OpenSpaceMeetingError(message, code, statusCode);
}

/**
 * Host-only: clears Redis `lobbyGateActive` so non-hosts can obtain RTC tokens.
 * Idempotent when the gate is already open.
 */
export async function openSpaceMeetingService(userId: string, roomId: string): Promise<void> {
  const access = await assertRoomSessionOpenOnAccess(roomId);
  if (!access.ok) {
    rejectOpenSpaceMeeting(userId, roomId, access.message, "INVALID_STATE", 410);
  }

  let room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    rejectOpenSpaceMeeting(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.roomType !== "space") {
    rejectOpenSpaceMeeting(userId, roomId, "Not a space room", "INVALID_STATE", 400);
  }
  if (room.hostUserId !== userId) {
    rejectOpenSpaceMeeting(userId, roomId, "Only the host can open this space", "NOT_HOST", 403);
  }
  if (room.status !== "live") {
    if (isScheduledSpaceBeforeStartTime(room)) {
      rejectOpenSpaceMeeting(
        userId,
        roomId,
        "This space hasn’t opened yet. Try again after the scheduled start time.",
        "LOBBY_NOT_READY",
        400,
      );
    }
    rejectOpenSpaceMeeting(userId, roomId, "Room is not live yet", "INVALID_STATE", 400);
  }

  const ok = await clearSpaceLobbyGateInRedis(roomId);
  if (!ok) {
    rejectOpenSpaceMeeting(
      userId,
      roomId,
      "Room session is not ready yet. Try again in a moment.",
      "SESSION_NOT_READY",
      503,
    );
  }

  await emitSpaceOpenedForJoin(roomId, { excludeUserId: userId });
  logger.info("space_meeting_opened", { userId, roomId });
}
