import { mergeRoomAdvancedOptions, resolveDeleteSpaceAfterCall } from "@/core/database/schema";
import logger from "@/core/logging";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";
import { notifyRtcServiceSfuRoomTeardown } from "@/modules/rooms/services/rtc/rtc-sfu-room-teardown.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";

export type LeaveSpaceRtcErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "NOT_ACTIVE_PARTICIPANT";

export class LeaveSpaceRtcError extends Error {
  constructor(
    message: string,
    public readonly code: LeaveSpaceRtcErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "LeaveSpaceRtcError";
  }
}

/**
 * Records the caller as departed from a live DB space (`leftAt`). If nobody remains:
 * - `deleteSpaceAfterCall`: end the circle immediately and clear Redis (opt-in one-shot spaces).
 * - Else: **do not** change `rooms.status`, `expires_at`, or `is_expired` — the circle stays live
 *   for rejoin until the host uses **end space for everyone** or wall-clock expiry from the
 *   original schedule (`expires_at` / `syncPastDueSpaceRoomExpiry`).
 */
export async function leaveSpaceRtcSessionForUser(
  userId: string,
  roomId: string,
  options: { httpStrict?: boolean } = {},
): Promise<{ roomEnded: boolean }> {
  const httpStrict = options.httpStrict ?? false;
  const room = await roomsRepository.findRoomById(roomId);

  if (!room || room.roomType !== "space") {
    if (httpStrict) {
      throw new LeaveSpaceRtcError("Room not found", "ROOM_NOT_FOUND", 404);
    }
    return { roomEnded: false };
  }

  if (isDbRoomSessionClosed(room)) {
    await deleteSessionRoomRedis(roomId);
    await clearUserActiveRtcRoom(userId);
    return { roomEnded: false };
  }

  if (room.status === "scheduled") {
    const activeLobby = await roomParticipantsRepository.isUserRoomParticipant(roomId, userId);
    if (activeLobby) {
      await roomParticipantsRepository.markParticipantLeft(roomId, userId);
      logger.debug("space_lobby_participant_left", { userId, roomId });
    }
    await clearUserActiveRtcRoom(userId);
    return { roomEnded: false };
  }

  if (room.status !== "live") {
    if (httpStrict) {
      throw new LeaveSpaceRtcError("Room is not live", "ROOM_NOT_LIVE", 400);
    }
    await clearUserActiveRtcRoom(userId);
    return { roomEnded: false };
  }

  const adv = mergeRoomAdvancedOptions(room.advancedOptions);

  const activeBefore = await roomParticipantsRepository.isUserRoomParticipant(roomId, userId);

  if (!activeBefore) {
    await clearUserActiveRtcRoom(userId);
    if (httpStrict) {
      const anyRow = await roomParticipantsRepository.wasUserRoomParticipant(roomId, userId);
      if (!anyRow) {
        throw new LeaveSpaceRtcError(
          "You are not in this call",
          "NOT_ACTIVE_PARTICIPANT",
          403,
        );
      }
    }
    return { roomEnded: false };
  }

  const now = new Date();

  const { lastParticipantLeft, roomEnded } = await roomSessionsRepository.leaveAndMaybeEndRoomTx(
    roomId,
    userId,
    now,
    resolveDeleteSpaceAfterCall(adv),
  );

  await clearUserActiveRtcRoom(userId);
  if (roomEnded) {
    await deleteSessionRoomRedis(roomId);
  }
  if (lastParticipantLeft) {
    await notifyRtcServiceSfuRoomTeardown(roomId);
  }
  return { roomEnded };
}

/** Matchmaking / keepalive paths: never throw; best-effort circle cleanup. */
export async function leaveSpaceRtcSessionInternal(userId: string, roomId: string): Promise<void> {
  try {
    await leaveSpaceRtcSessionForUser(userId, roomId, { httpStrict: false });
  } catch (err) {
    logger.warn("leaveSpaceRtcSessionInternal failed", {
      userId,
      roomId,
      err: String(err),
    });
  }
}
