import { getRedis } from "@/core/redis";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { removeCircleParticipantFromLive } from "@/modules/rooms/services/participation/remove-circle-participant-from-live.service";
import { userModerationRepository } from "@/modules/users/repositories/user-moderation.repository";

const NSFW_REPORT_COOLDOWN_SEC = 120;

export type ReportCircleNsfwViolationErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_IN_CALL"
  | "INVALID_STATE"
  | "RATE_LIMITED"
  | "ALREADY_REPORTED";

export class ReportCircleNsfwViolationError extends Error {
  constructor(
    message: string,
    public readonly code: ReportCircleNsfwViolationErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ReportCircleNsfwViolationError";
  }
}

function nsfwReportCooldownKey(userId: string, roomId: string): string {
  return `moderation:nsfw:report:${userId}:${roomId}`;
}

/**
 * Self-reported NSFW from the offender's client: strike++, kick from circle (restrict rejoin),
 * permanent ban on second strike within policy.
 */
export type ReportCircleNsfwViolationBody = {
  clientScores?: { className: string; probability: number }[];
};

export async function reportCircleNsfwViolationService(
  userId: string,
  roomId: string,
  body: ReportCircleNsfwViolationBody = {},
): Promise<{ removed: boolean; strikeCount: number; accountBanned: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "circle") {
    throw new ReportCircleNsfwViolationError("Room not found", "ROOM_NOT_FOUND", 404);
  }

  if (room.status !== "live") {
    throw new ReportCircleNsfwViolationError("Room is not live", "INVALID_STATE", 400);
  }

  const inCall = await roomParticipantsRepository.isUserRoomParticipant(roomId, userId);
  if (!inCall) {
    throw new ReportCircleNsfwViolationError(
      "You are not in this call",
      "NOT_IN_CALL",
      403,
    );
  }

  const redis = getRedis();
  const cooldownKey = nsfwReportCooldownKey(userId, roomId);
  const cooldown = await redis.set(cooldownKey, "1", "EX", NSFW_REPORT_COOLDOWN_SEC, "NX");
  if (cooldown !== "OK") {
    throw new ReportCircleNsfwViolationError(
      "Violation already reported for this session",
      "RATE_LIMITED",
      429,
    );
  }

  const { strikeCount } = await userModerationRepository.recordLiveCircleNsfwViolation({
    userId,
    roomId,
    clientScores: body.clientScores,
  });
  const accountBanned = strikeCount >= 2;
  if (accountBanned) {
    await userModerationRepository.setBanned(userId, "yes");
  }

  const restrictedByUserId = room.hostUserId ?? userId;
  const { removed } = await removeCircleParticipantFromLive(roomId, userId, {
    restrict: true,
    restrictedByUserId,
    socketReason: "nsfw",
    strikeCount,
  });

  return { removed, strikeCount, accountBanned };
}
