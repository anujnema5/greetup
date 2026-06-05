import logger from "@/core/logging";
import { signRtcJwtForRoom } from "@/core/rtc/rtc-jwt";
import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import { getRedis } from "@/core/redis";
import { ROOM_KEYS } from "@/core/redis/keys";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { maybeAutoStartScheduledCircleFromDb } from "@/modules/rooms/services/session/maybe-auto-start-scheduled-circle.service";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";
import { isScheduledCircleBeforeStartTime } from "@/modules/rooms/lib/session/scheduled-circle-lobby";
import {
  getOrCreateRoomConversation,
  ensureRoomConversationParticipant,
} from "@/modules/chat/services/room-conversation.service";
import { roomRestrictedUsersRepository } from "@/modules/rooms/repositories/room-restricted-users.repository";
import { setUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { isRoomSessionType } from "@/shared/types/room-session";

export type IssueRtcTokenErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "LOBBY_NOT_READY"
  | "ROOM_EXPIRED"
  | "NOT_ALLOWED"
  | "RESTRICTED"
  | "UNSUPPORTED_ROOM_TYPE"
  | "LOBBY_WAITING_FOR_HOST";

export class IssueRtcTokenError extends Error {
  constructor(
    message: string,
    public readonly code: IssueRtcTokenErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "IssueRtcTokenError";
  }
}

function rejectIssueRtcToken(
  userId: string,
  roomId: string,
  message: string,
  code: IssueRtcTokenErrorCode,
  statusCode: number,
): never {
  logger.warn("rtc_token_rejected", { userId, roomId, code, message });
  throw new IssueRtcTokenError(message, code, statusCode);
}

/** RTC JWT for direct or circle; caller must be host or participant; room must be live. */
export async function issueRtcTokenService(userId: string, roomId: string) {
  let room = await roomsRepository.findRoomById(roomId);

  if (!room) {
    rejectIssueRtcToken(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }

  if (room.roomType === "circle" && room.status === "scheduled") {
    await maybeAutoStartScheduledCircleFromDb(roomId);
    room = await roomsRepository.findRoomById(roomId);
    if (!room) {
      rejectIssueRtcToken(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
    }
  }

  if (room.roomType === "direct" || room.roomType === "circle") {
    const access = await assertRoomSessionOpenOnAccess(roomId);
    if (!access.ok) {
      rejectIssueRtcToken(userId, roomId, access.message, "ROOM_EXPIRED", 410);
    }
    room = (await roomsRepository.findRoomById(roomId)) ?? room;
  }

  const { roomType } = room;
  if (!isRoomSessionType(roomType)) {
    rejectIssueRtcToken(
      userId,
      roomId,
      "RTC token is not supported for this room type",
      "UNSUPPORTED_ROOM_TYPE",
      400,
    );
  }

  if (isScheduledCircleBeforeStartTime(room)) {
    rejectIssueRtcToken(
      userId,
      roomId,
      "This circle hasn’t opened yet. Try again after the scheduled start time.",
      "LOBBY_NOT_READY",
      400,
    );
  }

  if (room.status !== "live") {
    rejectIssueRtcToken(userId, roomId, "Room is not live yet", "ROOM_NOT_LIVE", 400);
  }

  await roomSessionsRepository.restartLiveSessionClockIfNoActiveParticipants(roomId);

  const isHost = room.hostUserId === userId;

  if (
    room.roomType === "circle" &&
    !isHost &&
    (await roomRestrictedUsersRepository.isRoomRestrictedUser(roomId, userId))
  ) {
    rejectIssueRtcToken(
      userId,
      roomId,
      "You are not allowed to rejoin this circle",
      "RESTRICTED",
      403,
    );
  }

  const isParticipant =
    isHost ||
    (await roomParticipantsRepository.isUserRoomParticipant(roomId, userId)) ||
    (await roomParticipantsRepository.wasUserRoomParticipant(roomId, userId));

  if (!isParticipant) {
    rejectIssueRtcToken(
      userId,
      roomId,
      "You are not allowed to join this room",
      "NOT_ALLOWED",
      403,
    );
  }

  if (room.roomType === "circle") {
    const adv = mergeRoomAdvancedOptions(room.advancedOptions);
    if (adv.shouldHostStartMeeting && !isHost) {
      const redis = getRedis();
      const key = `${ROOM_KEYS.ROOM}${roomId}`;
      if (await redis.exists(key)) {
        const gate = await redis.hget(key, "lobbyGateActive");
        if (gate === "1") {
          rejectIssueRtcToken(
            userId,
            roomId,
            "The host has not opened the circle yet.",
            "LOBBY_WAITING_FOR_HOST",
            403,
          );
        }
      }
    }
  }

  const { token, expiresInSec } = await signRtcJwtForRoom({
    userId,
    roomId,
    roomType,
  });

  // Auto-create room conversation and ensure this user is a participant
  const conversationId = await getOrCreateRoomConversation(roomId, roomType, room.hostUserId);
  await ensureRoomConversationParticipant(roomId, userId);

  await setUserActiveRtcRoom(userId, roomId);

  logger.info("rtc_token_issued", { userId, roomId, roomType, conversationId, expiresInSec });

  return {
    token,
    expiresInSec,
    roomId,
    roomType,
    conversationId,
  };
}
