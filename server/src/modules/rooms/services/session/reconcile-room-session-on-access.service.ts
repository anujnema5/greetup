import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { roomParticipants, rooms } from "@/core/database/schema";
import logger from "@/core/logging";
import { SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES } from "@/modules/rooms/constants/session/scheduled-circle-join-grace";
import { coerceRoomDate } from "@/modules/rooms/lib/session/coerce-room-date";
import {
  evaluateRoomSessionEndReason,
  roomSessionClosedMessage,
  type ParticipantPresence,
  type RoomRowForReconcile,
} from "@/modules/rooms/lib/session/reconcile-room-session-eval";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/expiry/room-expiry";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { endLiveRoomSession } from "@/modules/rooms/services/session/end-live-room-session.service";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/rtc/session-room-redis.service";
import type { ReconcileRoomSessionResult, RoomSessionEndReason } from "@/modules/rooms/types";

export { roomSessionClosedMessage };

async function loadParticipantPresence(roomId: string): Promise<ParticipantPresence> {
  const [countRow] = await db
    .select({ n: sql<number>`cast(count(*) as int)` })
    .from(roomParticipants)
    .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

  const [leftRow] = await db
    .select({
      lastLeftAt: sql<Date | null>`max(${roomParticipants.leftAt})`,
    })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, roomId));

  return {
    activeCount: countRow?.n ?? 0,
    lastLeftAt: coerceRoomDate(leftRow?.lastLeftAt ?? null),
  };
}

async function expireScheduledJoinGraceMissed(roomId: string): Promise<boolean> {
  const [row] = await db
    .update(rooms)
    .set({ isExpired: true, updatedAt: new Date() })
    .where(
      and(
        eq(rooms.id, roomId),
        eq(rooms.roomType, "circle"),
        eq(rooms.status, "scheduled"),
        sql`(${rooms.scheduledStartAt} + (${SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES} * interval '1 minute')) < NOW()`,
      ),
    )
    .returning({ id: rooms.id });

  if (row) {
    await deleteSessionRoomRedis(roomId);
  }
  return Boolean(row);
}

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
  const presence = await loadParticipantPresence(roomId);
  const endReason = evaluateRoomSessionEndReason(row, presence);

  if (!endReason) {
    if (isDbRoomSessionClosed(room) && room.status !== "live") {
      await deleteSessionRoomRedis(roomId);
      return { closed: true, alreadyWasClosed: true, reason: "expires_at_past" };
    }
    return { closed: false, alreadyWasClosed: false, reason: null };
  }

  if (endReason === "join_grace_missed") {
    const expired = await expireScheduledJoinGraceMissed(roomId);
    if (expired) {
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
