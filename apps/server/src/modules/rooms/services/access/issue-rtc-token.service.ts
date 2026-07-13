import logger from "@/core/logging";
import { signRtcJwtForRoom } from "@/core/rtc/rtc-jwt";
import { mergeRoomAdvancedOptions } from "@/core/database/schema";
import { getRedis } from "@/core/redis";
import { ROOM_KEYS } from "@/core/redis/keys";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { maybeAutoStartScheduledSpaceFromDb } from "@/modules/rooms/services/session/maybe-auto-start-scheduled-space.service";
import { assertRoomSessionOpenOnAccess } from "@/modules/rooms/services/session/reconcile-room-session-on-access.service";
import { isScheduledSpaceBeforeStartTime } from "@/modules/rooms/lib/session/scheduled-space-lobby";
import {
  getOrCreateRoomConversation,
  ensureRoomConversationParticipant,
} from "@/modules/chat/services/room-conversation.service";
import { roomRestrictedUsersRepository } from "@/modules/rooms/repositories/room-restricted-users.repository";
import { setUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import { syncGuestMatchRoomSessionCap } from "@/modules/rooms/services/session/sync-guest-match-room-session-cap.service";
import { isRoomSessionType, type RoomSessionType } from "@/shared/types/room-session";
import { assertGuestMayAccessRoom, consumeGuestCallTrial } from "@/modules/guest";

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

export type RtcTokenPayload = {
  token: string;
  expiresInSec: number;
  roomId: string;
  roomType: RoomSessionType;
  conversationId: string;
};

type RoomRow = NonNullable<Awaited<ReturnType<typeof roomsRepository.findRoomById>>>;

export type IssueRtcTokenOptions = {
  /** Room row already loaded (e.g. by joinRoomService). */
  room?: RoomRow;
  /** Skips guest/reconcile/participant checks already performed by joinRoomService. */
  afterJoin?: boolean;
};

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

async function finalizeRtcTokenIssue(
  userId: string,
  roomId: string,
  room: RoomRow,
  roomType: RoomSessionType,
): Promise<RtcTokenPayload> {
  logger.info("rtc_token", { step: "sign_jwt", userId, roomId });

  const [{ token, expiresInSec }, conversationId] = await Promise.all([
    signRtcJwtForRoom({ userId, roomId, roomType }),
    (async () => {
      logger.info("rtc_token", { step: "room_conversation", userId, roomId });
      const id = await getOrCreateRoomConversation(roomId, roomType, room.hostUserId);
      await ensureRoomConversationParticipant(roomId, userId);
      return id;
    })(),
  ]);

  logger.info("rtc_token", { step: "side_effects", userId, roomId });
  await Promise.all([
    consumeGuestCallTrial(userId, { roomId }),
    syncGuestMatchRoomSessionCap(roomId),
    setUserActiveRtcRoom(userId, roomId),
  ]);

  logger.info("rtc_token_issued", { userId, roomId, roomType, conversationId, expiresInSec });

  return {
    token,
    expiresInSec,
    roomId,
    roomType,
    conversationId,
  };
}

/** RTC JWT for direct or space; caller must be host or participant; room must be live. */
export async function issueRtcTokenService(
  userId: string,
  roomId: string,
  options?: IssueRtcTokenOptions,
): Promise<RtcTokenPayload> {
  const afterJoin = options?.afterJoin === true;
  logger.info("rtc_token", { step: "start", userId, roomId, afterJoin });

  let room = options?.room ?? (await roomsRepository.findRoomById(roomId));
  logger.info("rtc_token", { step: "find_room", userId, roomId, found: Boolean(room) });

  if (!room) {
    rejectIssueRtcToken(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
  }

  if (!afterJoin) {
    await assertGuestMayAccessRoom(userId, {
      roomType: room.roomType,
      sessionKind: room.sessionKind,
    });
    logger.info("rtc_token", { step: "guest_access", userId, roomId });

    if (room.roomType === "space" && room.status === "scheduled") {
      await maybeAutoStartScheduledSpaceFromDb(roomId);
      room = (await roomsRepository.findRoomById(roomId)) ?? room;
      logger.info("rtc_token", { step: "auto_start_scheduled_space", userId, roomId });
      if (!room) {
        rejectIssueRtcToken(userId, roomId, "Room not found", "ROOM_NOT_FOUND", 404);
      }
    }

    if (room.roomType === "direct" || room.roomType === "space") {
      const access = await assertRoomSessionOpenOnAccess(roomId);
      logger.info("rtc_token", { step: "reconcile_session", userId, roomId, ok: access.ok });
      if (!access.ok) {
        rejectIssueRtcToken(userId, roomId, access.message, "ROOM_EXPIRED", 410);
      }
      room = (await roomsRepository.findRoomById(roomId)) ?? room;
    }
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

  if (isScheduledSpaceBeforeStartTime(room)) {
    rejectIssueRtcToken(
      userId,
      roomId,
      "This space hasn’t opened yet. Try again after the scheduled start time.",
      "LOBBY_NOT_READY",
      400,
    );
  }

  if (room.status !== "live") {
    rejectIssueRtcToken(userId, roomId, "Room is not live yet", "ROOM_NOT_LIVE", 400);
  }

  await roomSessionsRepository.restartLiveSessionClockIfNoActiveParticipants(roomId);
  logger.info("rtc_token", { step: "restart_live_session_clock", userId, roomId });

  const isHost = room.hostUserId === userId;

  if (
    room.roomType === "space" &&
    !isHost &&
    (await roomRestrictedUsersRepository.isRoomRestrictedUser(roomId, userId))
  ) {
    rejectIssueRtcToken(
      userId,
      roomId,
      "You are not allowed to rejoin this space",
      "RESTRICTED",
      403,
    );
  }

  if (!afterJoin) {
    const participantRow = await roomParticipantsRepository.findRoomParticipant(roomId, userId);
    const isParticipant = isHost || participantRow != null;
    logger.info("rtc_token", { step: "participant_check", userId, roomId, isParticipant });
    if (!isParticipant) {
      rejectIssueRtcToken(
        userId,
        roomId,
        "You are not allowed to join this room",
        "NOT_ALLOWED",
        403,
      );
    }
  }

  if (room.roomType === "space") {
    const adv = mergeRoomAdvancedOptions(room.advancedOptions);
    if (adv.shouldHostStartMeeting && !isHost) {
      const redis = getRedis();
      const key = `${ROOM_KEYS.ROOM}${roomId}`;
      if (await redis.exists(key)) {
        const gate = await redis.hget(key, "lobbyGateActive");
        logger.info("rtc_token", { step: "lobby_gate_check", userId, roomId, gate });
        if (gate === "1") {
          rejectIssueRtcToken(
            userId,
            roomId,
            "The host has not opened the space yet.",
            "LOBBY_WAITING_FOR_HOST",
            403,
          );
        }
      }
    }
  }

  return finalizeRtcTokenIssue(userId, roomId, room, roomType);
}
