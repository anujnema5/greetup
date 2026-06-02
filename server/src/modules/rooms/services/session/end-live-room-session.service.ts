import logger from "@/core/logging";
import { emitToUser } from "@/core/socket/socket";
import { CIRCLE_ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/events/circle-room-socket.events";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { roomParticipantsRepository } from "@/modules/rooms/repositories/room-participants.repository";
import { notifyRtcServiceSfuRoomTeardown } from "@/modules/rooms/services/rtc/rtc-sfu-room-teardown.service";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/rtc/user-active-rtc-room-redis.service";
import type {
  EndLiveRoomSessionOptions,
  EndLiveRoomSessionResult,
  RoomSessionEndReason,
} from "@/modules/rooms/types";

function shouldPreserveScheduledSlot(
  room: {
    roomType: string;
    scheduledStartAt: Date | null;
  },
  reason: RoomSessionEndReason,
  options: EndLiveRoomSessionOptions,
): boolean {
  if (options.preserveScheduledSlot !== undefined) {
    return options.preserveScheduledSlot;
  }
  if (room.roomType !== "circle" || !room.scheduledStartAt) {
    return false;
  }
  return reason !== "delete_circle_after_call" && reason !== "match_finalized";
}

async function notifyCircleParticipantsToLeave(
  roomId: string,
  hostUserId: string,
  excludeUserId?: string,
): Promise<void> {
  const userIds = await roomParticipantsRepository.listAllParticipantUserIds(roomId);
  const payload = { roomId };
  for (const uid of userIds) {
    if (uid === hostUserId || uid === excludeUserId) continue;
    emitToUser(uid, CIRCLE_ROOM_SOCKET_EVENTS.hostEndedForEveryone, payload);
  }
}

/**
 * Idempotent: marks active participants left, closes live DB session, clears Redis + SFU.
 * Used by host end, match finalize, deleteCircleAfterCall, join-time reconcile, and background sweep.
 */
export async function endLiveRoomSession(
  roomId: string,
  reason: RoomSessionEndReason,
  options: EndLiveRoomSessionOptions = {},
): Promise<EndLiveRoomSessionResult> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    return { ended: false, alreadyClosed: true, reason };
  }

  const participantUserIds = await roomParticipantsRepository.listAllParticipantUserIds(roomId);

  if (isDbRoomSessionClosed(room) || room.status !== "live") {
    await deleteSessionRoomRedis(roomId);
    await Promise.all(participantUserIds.map((uid) => clearUserActiveRtcRoom(uid)));
    return { ended: false, alreadyClosed: true, reason };
  }

  const now = new Date();
  const preserveScheduledSlot = shouldPreserveScheduledSlot(room, reason, options);

  const { transitioned } = await roomSessionsRepository.endLiveRoomSessionTx({
    roomId,
    now,
    roomType: room.roomType,
    hostUserId: room.hostUserId,
    preserveScheduledSlot,
    scheduledStartAt: room.scheduledStartAt,
    scheduledEndAt: room.scheduledEndAt,
    advancedOptions: room.advancedOptions,
  });

  await deleteSessionRoomRedis(roomId);
  await Promise.all(participantUserIds.map((uid) => clearUserActiveRtcRoom(uid)));

  if (transitioned) {
    await notifyRtcServiceSfuRoomTeardown(roomId);

    const shouldNotify =
      options.notifyParticipants ??
      (room.roomType === "circle" && reason !== "match_finalized");

    if (shouldNotify && room.roomType === "circle") {
      await notifyCircleParticipantsToLeave(
        roomId,
        room.hostUserId,
        options.excludeUserIdFromNotify,
      );
    }

    logger.info("room_session_ended", {
      roomId,
      reason,
      roomType: room.roomType,
      sessionKind: room.sessionKind,
      preserveScheduledSlot,
    });
  }

  return {
    ended: transitioned,
    alreadyClosed: !transitioned,
    reason,
  };
}
