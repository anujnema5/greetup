import { signRtcJwtForRoom } from "@/core/rtc/rtc-jwt";
import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import { getRedis } from "@/core/redis";
import { ROOM_KEYS } from "@/core/redis/keys";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/room-expiry";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/session-room-redis.service";
import { maybeAutoStartScheduledCircleFromDb } from "@/modules/rooms/services/maybe-auto-start-scheduled-circle.service";
import { syncCircleRoomExpiryFromClockIfDue } from "@/modules/rooms/services/circle-room-expiry-sync.service";
import { isScheduledCircleBeforeStartTime } from "@/modules/rooms/lib/scheduled-circle-lobby";
import {
  getOrCreateRoomConversation,
  ensureRoomConversationParticipant,
} from "@/modules/chat/services/room-conversation.service";
import { roomRestrictedUsersRepository } from "@/modules/rooms/repositories/room-restricted-users.repository";
import { setUserActiveRtcRoom } from "@/modules/rooms/services/user-active-rtc-room-redis.service";
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

/** RTC JWT for direct or circle; caller must be host or participant; room must be live. */
export async function issueRtcTokenService(userId: string, roomId: string) {
  let room = await roomsRepository.findRoomById(roomId);

  if (!room) {
    throw new IssueRtcTokenError("Room not found", "ROOM_NOT_FOUND", 404);
  }

  if (room.roomType === "circle" && room.status === "scheduled") {
    await maybeAutoStartScheduledCircleFromDb(roomId);
    room = await roomsRepository.findRoomById(roomId);
    if (!room) {
      throw new IssueRtcTokenError("Room not found", "ROOM_NOT_FOUND", 404);
    }
  }

  if (room.roomType === "circle") {
    await syncCircleRoomExpiryFromClockIfDue(roomId);
    room = (await roomsRepository.findRoomById(roomId)) ?? room;
  }

  const { roomType } = room;
  if (!isRoomSessionType(roomType)) {
    throw new IssueRtcTokenError(
      "RTC token is not supported for this room type",
      "UNSUPPORTED_ROOM_TYPE",
      400,
    );
  }

  if (isScheduledCircleBeforeStartTime(room)) {
    throw new IssueRtcTokenError(
      "This circle hasn’t opened yet. Try again after the scheduled start time.",
      "LOBBY_NOT_READY",
      400,
    );
  }

  if (room.status !== "live") {
    throw new IssueRtcTokenError("Room is not live yet", "ROOM_NOT_LIVE", 400);
  }

  if (room.roomType === "circle" && isDbRoomSessionClosed(room)) {
    await deleteSessionRoomRedis(roomId);
    throw new IssueRtcTokenError("This circle is no longer available", "ROOM_EXPIRED", 410);
  }

  const isHost = room.hostUserId === userId;

  if (
    room.roomType === "circle" &&
    !isHost &&
    (await roomRestrictedUsersRepository.isRoomRestrictedUser(roomId, userId))
  ) {
    throw new IssueRtcTokenError(
      "You are not allowed to rejoin this circle",
      "RESTRICTED",
      403,
    );
  }

  const isParticipant = isHost || (await roomsRepository.isUserRoomParticipant(roomId, userId));

  if (!isParticipant) {
    throw new IssueRtcTokenError(
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
          throw new IssueRtcTokenError(
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

  return {
    token,
    expiresInSec,
    roomId,
    roomType,
    conversationId,
  };
}
