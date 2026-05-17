import { isScheduledCircleBeforeStartTime } from "@/modules/rooms/lib/scheduled-circle-lobby";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/reconcile-room-session-on-access.service";
import { roomsRepository } from "../repositories/rooms.repository";
import { clearCircleLobbyGateInRedis } from "./session-room-redis.service";

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

/**
 * Host-only: clears Redis `lobbyGateActive` so non-hosts can obtain RTC tokens.
 * Idempotent when the gate is already open.
 */
export async function openCircleMeetingService(userId: string, roomId: string): Promise<void> {
  const access = await assertRoomSessionOpenOnAccess(roomId);
  if (!access.ok) {
    throw new OpenCircleMeetingError(access.message, "INVALID_STATE", 410);
  }

  let room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    throw new OpenCircleMeetingError("Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.roomType !== "circle") {
    throw new OpenCircleMeetingError("Not a circle room", "INVALID_STATE", 400);
  }
  if (room.hostUserId !== userId) {
    throw new OpenCircleMeetingError("Only the host can open this circle", "NOT_HOST", 403);
  }
  if (room.status !== "live") {
    if (isScheduledCircleBeforeStartTime(room)) {
      throw new OpenCircleMeetingError(
        "This circle hasn’t opened yet. Try again after the scheduled start time.",
        "LOBBY_NOT_READY",
        400,
      );
    }
    throw new OpenCircleMeetingError("Room is not live yet", "INVALID_STATE", 400);
  }

  const ok = await clearCircleLobbyGateInRedis(roomId);
  if (!ok) {
    throw new OpenCircleMeetingError(
      "Room session is not ready yet. Try again in a moment.",
      "SESSION_NOT_READY",
      503,
    );
  }
}
