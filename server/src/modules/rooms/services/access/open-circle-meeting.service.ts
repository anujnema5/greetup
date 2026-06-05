import logger from "@/core/logging";
import { isScheduledCircleBeforeStartTime } from "@/modules/rooms/lib/session/scheduled-circle-lobby";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";
import { roomsRepository } from "../../repositories/rooms.repository";
import { emitCircleOpenedForJoin } from "@/modules/rooms/socket/circle-room-socket.handler";
import { clearCircleLobbyGateInRedis } from "../rtc/session-room-redis.service";

export type OpenCircleMeetingErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_HOST"
  | "INVALID_STATE"
  | "LOBBY_NOT_READY"
  | "SESSION_NOT_READY";

export class OpenCircleMeetingError extends Error {
  constructor(
    message: string,
    public readonly code: OpenCircleMeetingErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "OpenCircleMeetingError";
  }
}

function rejectOpenCircleMeeting(
  userId: string,
  roomId: string,
  message: string,
  code: OpenCircleMeetingErrorCode,
  statusCode: number,
): never {
  logger.warn("circle_meeting_open_rejected", { userId, roomId, code, message });
  throw new OpenCircleMeetingError(message, code, statusCode);
}

/**
 * Host-only: clears Redis `lobbyGateActive` so non-hosts can obtain RTC tokens.
 * Idempotent when the gate is already open.
 */
export async function openCircleMeetingService(userId: string, roomId: string): Promise<void> {
  const access = await assertRoomSessionOpenOnAccess(roomId);
  if (!access.ok) {
    rejectOpenCircleMeeting(userId, roomId, access.message, "INVALID_STATE", 410);
  }

  let room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    rejectOpenCircleMeeting(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.roomType !== "circle") {
    rejectOpenCircleMeeting(userId, roomId, "Not a circle room", "INVALID_STATE", 400);
  }
  if (room.hostUserId !== userId) {
    rejectOpenCircleMeeting(userId, roomId, "Only the host can open this circle", "NOT_HOST", 403);
  }
  if (room.status !== "live") {
    if (isScheduledCircleBeforeStartTime(room)) {
      rejectOpenCircleMeeting(
        userId,
        roomId,
        "This circle hasn’t opened yet. Try again after the scheduled start time.",
        "LOBBY_NOT_READY",
        400,
      );
    }
    rejectOpenCircleMeeting(userId, roomId, "Room is not live yet", "INVALID_STATE", 400);
  }

  const ok = await clearCircleLobbyGateInRedis(roomId);
  if (!ok) {
    rejectOpenCircleMeeting(
      userId,
      roomId,
      "Room session is not ready yet. Try again in a moment.",
      "SESSION_NOT_READY",
      503,
    );
  }

  await emitCircleOpenedForJoin(roomId, { excludeUserId: userId });
  logger.info("circle_meeting_opened", { userId, roomId });
}
