import logger from "@/core/logging";
import {
  evaluateRoomSessionEndReason,
  roomSessionClosedMessage,
  type ParticipantPresence,
  type RoomRowForReconcile,
} from "@/modules/rooms/lib/session/reconcile-room-session-eval";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { roomSessionsRepository } from "@/modules/rooms/repositories/room-sessions.repository";
import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";
import type { ReconcileRoomSessionResult, RoomSessionEndReason } from "@/modules/rooms/types";

export { roomSessionClosedMessage };

function toReconcileRow(
  room: NonNullable<Awaited<ReturnType<typeof roomsRepository.findRoomById>>>,
): RoomRowForReconcile {
  return {
    id: room.id,
    roomType: room.roomType,
    status: room.status,
    startedAt: room.startedAt,
    scheduledStartAt: room.scheduledStartAt,
    scheduledEndAt: room.scheduledEndAt,
    expiresAt: room.expiresAt,
    isExpired: room.isExpired,
    advancedOptions: room.advancedOptions,
  };
}

/**
 * Join / RTC token / GET room: verify wall-clock rules and end stale live sessions before access.
 */
export async function reconcileRoomSessionOnAccess(
  roomId: string,
): Promise<ReconcileRoomSessionResult> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room) {
    return { closed: false, alreadyWasClosed: true, reason: null };
  }

  if (room.status === "ended" || room.status === "cancelled") {
    await deleteSessionRoomRedis(roomId);
    return { closed: true, alreadyWasClosed: true, reason: null };
  }

  const row = toReconcileRow(room);
  const presence = await roomSessionsRepository.loadParticipantPresence(roomId);
  const endReason = evaluateRoomSessionEndReason(row, presence);

  if (!endReason) {
    if (isDbRoomSessionClosed(room) && room.status !== "live") {
      await deleteSessionRoomRedis(roomId);
      return { closed: true, alreadyWasClosed: true, reason: "expires_at_past" };
    }
    return { closed: false, alreadyWasClosed: false, reason: null };
  }

  if (endReason === "join_grace_missed") {
    const expired = await roomSessionsRepository.expireScheduledJoinGraceMissed(roomId);
    if (expired) {
      await deleteSessionRoomRedis(roomId);
      logger.info("room_session_reconciled", { roomId, reason: endReason });
    }
    return {
      closed: expired,
      alreadyWasClosed: !expired,
      reason: expired ? endReason : null,
    };
  }

  const endResult = await endLiveRoomSession(roomId, endReason, {
    notifyParticipants: room.roomType === "circle",
  });

  if (endResult.ended) {
    logger.info("room_session_reconciled", { roomId, reason: endReason });
  }

  return {
    closed: endResult.ended || endResult.alreadyClosed,
    alreadyWasClosed: endResult.alreadyClosed && !endResult.ended,
    reason: endResult.ended || endResult.alreadyClosed ? endReason : null,
  };
}

export async function assertRoomSessionOpenOnAccess(
  roomId: string,
): Promise<{ ok: true } | { ok: false; message: string; reason: RoomSessionEndReason | null }> {
  const result = await reconcileRoomSessionOnAccess(roomId);
  if (!result.closed) {
    return { ok: true };
  }
  return {
    ok: false,
    message: roomSessionClosedMessage(result.reason),
    reason: result.reason,
  };
}
