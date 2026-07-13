import logger from "@/core/logging";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { removeSpaceParticipantFromLive } from "./remove-space-participant-from-live.service";

export type KickSpaceParticipantOptions = {
  /** When true, the user cannot rejoin this circle until the restriction is cleared. */
  restrict?: boolean;
};

export type KickSpaceParticipantErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_HOST"
  | "INVALID_STATE"
  | "TARGET_NOT_FOUND"
  | "CANNOT_REMOVE_SELF"
  | "CANNOT_REMOVE_HOST";

export class KickSpaceParticipantError extends Error {
  constructor(
    message: string,
    public readonly code: KickSpaceParticipantErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "KickSpaceParticipantError";
  }
}

function rejectKickSpaceParticipant(
  hostUserId: string,
  roomId: string,
  targetUserId: string,
  message: string,
  code: KickSpaceParticipantErrorCode,
  statusCode: number,
): never {
  logger.warn("space_participant_kick_rejected", {
    hostUserId,
    roomId,
    targetUserId,
    code,
    message,
  });
  throw new KickSpaceParticipantError(message, code, statusCode);
}

/**
 * Host-only: marks the target participant as left, clears their active RTC room key,
 * evicts them from rtc-service, and notifies them on the main app socket.
 */
export async function kickSpaceParticipantService(
  hostUserId: string,
  roomId: string,
  targetUserId: string,
  options: KickSpaceParticipantOptions = {},
): Promise<{ removed: boolean; restricted: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "space") {
    rejectKickSpaceParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "Room not found",
      "ROOM_NOT_FOUND",
      404,
    );
  }
  if (room.hostUserId !== hostUserId) {
    rejectKickSpaceParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "Only the host can remove participants",
      "NOT_HOST",
      403,
    );
  }
  if (targetUserId === hostUserId) {
    rejectKickSpaceParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "You cannot remove yourself from the space",
      "CANNOT_REMOVE_SELF",
      400,
    );
  }
  if (targetUserId === room.hostUserId) {
    rejectKickSpaceParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "The host cannot be removed",
      "CANNOT_REMOVE_HOST",
      400,
    );
  }

  if (room.status !== "live") {
    rejectKickSpaceParticipant(
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
    rejectKickSpaceParticipant(
      hostUserId,
      roomId,
      targetUserId,
      "Participant is not in this call",
      "TARGET_NOT_FOUND",
      404,
    );
  }

  const result = await removeSpaceParticipantFromLive(roomId, targetUserId, {
    restrict: options.restrict === true,
    restrictedByUserId: hostUserId,
    socketReason: "host_removed",
  });
  logger.info("space_participant_kicked", {
    hostUserId,
    roomId,
    targetUserId,
    restricted: result.restricted,
  });
  return result;
}
