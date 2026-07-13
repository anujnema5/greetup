import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { removeSpaceParticipantFromLive } from "@/modules/rooms/services/participation/remove-space-participant-from-live.service";
import { userModerationRepository } from "@/modules/users/repositories/user-moderation.repository";

const NSFW_REPORT_COOLDOWN_SEC = 120;

export type ReportSpaceNsfwViolationErrorCode =
  | "ROOM_NOT_FOUND"
  | "NOT_IN_CALL"
  | "INVALID_STATE"
  | "RATE_LIMITED"
  | "ALREADY_REPORTED";

export class ReportSpaceNsfwViolationError extends Error {
  constructor(
    message: string,
    public readonly code: ReportSpaceNsfwViolationErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ReportSpaceNsfwViolationError";
  }
}

function nsfwReportCooldownKey(userId: string, roomId: string): string {
  return `moderation:nsfw:report:${userId}:${roomId}`;
}

function rejectNsfwReport(
  userId: string,
  roomId: string,
  message: string,
  code: ReportSpaceNsfwViolationErrorCode,
  statusCode: number,
): never {
  logger.warn("space_nsfw_report_rejected", { userId, roomId, code, message });
  throw new ReportSpaceNsfwViolationError(message, code, statusCode);
}

/**
 * Self-reported NSFW from the offender's client: strike++, kick from space (restrict rejoin),
 * permanent ban on second strike within policy.
 */
export type ReportSpaceNsfwViolationBody = {
  clientScores?: { className: string; probability: number }[];
};

export async function reportSpaceNsfwViolationService(
  userId: string,
  roomId: string,
  body: ReportSpaceNsfwViolationBody = {},
): Promise<{ removed: boolean; strikeCount: number; accountBanned: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "space") {
    rejectNsfwReport(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }

  if (room.status !== "live") {
    rejectNsfwReport(userId, roomId, "Room is not live", "INVALID_STATE", 400);
  }

  const inCall = await roomParticipantsRepository.isUserRoomParticipant(roomId, userId);
  if (!inCall) {
    rejectNsfwReport(userId, roomId, "You are not in this call", "NOT_IN_CALL", 403);
  }

  const redis = getRedis();
  const cooldownKey = nsfwReportCooldownKey(userId, roomId);
  const cooldown = await redis.set(cooldownKey, "1", "EX", NSFW_REPORT_COOLDOWN_SEC, "NX");
  if (cooldown !== "OK") {
    rejectNsfwReport(
      userId,
      roomId,
      "Violation already reported for this session",
      "RATE_LIMITED",
      429,
    );
  }

  const { strikeCount } = await userModerationRepository.recordLiveSpaceNsfwViolation({
    userId,
    roomId,
    clientScores: body.clientScores,
  });
  const accountBanned = strikeCount >= 2;
  if (accountBanned) {
    await userModerationRepository.setBanned(userId, "yes");
  }

  const restrictedByUserId = room.hostUserId ?? userId;
  const { removed } = await removeSpaceParticipantFromLive(roomId, userId, {
    restrict: true,
    restrictedByUserId,
    socketReason: "nsfw",
    strikeCount,
  });

  logger.info("space_nsfw_violation_reported", {
    userId,
    roomId,
    removed,
    strikeCount,
    accountBanned,
  });
  return { removed, strikeCount, accountBanned };
}
