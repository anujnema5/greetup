import logger from "@/core/logging";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { removeCircleParticipantFromLive } from "./remove-circle-participant-from-live.service";

export type KickCircleParticipantOptions = {
  /** When true, the user cannot rejoin this circle until the restriction is cleared. */
  restrict?: boolean;
};

export type KickCircleParticipantErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_HOST"
  | "INVALID_STATE"
  | "TARGET_NOT_FOUND"
  | "CANNOT_REMOVE_SELF"
  | "CANNOT_REMOVE_HOST";

export class KickCircleParticipantError extends Error {
  constructor(
    message: string,
    public readonly code: KickCircleParticipantErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "KickCircleParticipantError";
  }
}

function rejectKickCircleParticipant(
  hostUserId: string,
  roomId: string,
  targetUserId: string,
  message: string,
  code: KickCircleParticipantErrorCode,
  statusCode: number,
): never {
  logger.warn("circle_participant_kick_rejected", {
    hostUserId,
    roomId,
    targetUserId,
    code,
    message,
  });
  throw new KickCircleParticipantError(message, code, statusCode);
}

/**
 * Host-only: marks the target participant as left, clears their active RTC room key,
 * evicts them from rtc-service, and notifies them on the main app socket.
 */
export async function kickCircleParticipantService(
  hostUserId: string,
  roomId: string,
  targetUserId: string,
  options: KickCircleParticipantOptions = {},
): Promise<{ removed: boolean; restricted: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "circle") {
    rejectKickCircleParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "Room not found",
      "ROOM_NOT_FOUND",
      404,
    );
  }
  if (room.hostUserId !== hostUserId) {
    rejectKickCircleParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "Only the host can remove participants",
      "NOT_HOST",
      403,
    );
  }
  if (targetUserId === hostUserId) {
    rejectKickCircleParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "You cannot remove yourself from the circle",
      "CANNOT_REMOVE_SELF",
      400,
    );
  }
  if (targetUserId === room.hostUserId) {
    rejectKickCircleParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "The host cannot be removed",
      "CANNOT_REMOVE_HOST",
      400,
    );
  }

  if (room.status !== "live") {
    rejectKickCircleParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "Room is not live",
      "INVALID_STATE",
      400,
    );
  }

  const activeTarget = await roomParticipantsRepository.isUserRoomParticipant(roomId, targetUserId);

  if (!activeTarget) {
    rejectKickCircleParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "Participant is not in this call",
      "TARGET_NOT_FOUND",
      404,
    );
  }

  const result = await removeCircleParticipantFromLive(roomId, targetUserId, {
    restrict: options.restrict === true,
    restrictedByUserId: hostUserId,
    socketReason: "host_removed",
  });
  logger.info("circle_participant_kicked", {
    hostUserId,
    roomId,
    targetUserId,
    restricted: result.restricted,
  });
  return result;
}
