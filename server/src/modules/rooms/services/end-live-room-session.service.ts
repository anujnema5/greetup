import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/core/database";
import { roomParticipants, rooms } from "@/core/database/schema";
import logger from "@/core/logging";
import { emitToUser } from "@/core/socket/socket";
import { CIRCLE_ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/circle-room-socket.events";
import { computeRoomExpiryFields, isDbRoomSessionClosed } from "@/modules/rooms/lib/room-expiry";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { notifyRtcServiceSfuRoomTeardown } from "@/modules/rooms/services/rtc-sfu-room-teardown.service";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/session-room-redis.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/user-active-rtc-room-redis.service";
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

async function listParticipantUserIds(roomId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: roomParticipants.userId })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, roomId));
  return [...new Set(rows.map((r) => r.userId))];
}

async function notifyCircleParticipantsToLeave(
  roomId: string,
  hostUserId: string,
  excludeUserId?: string,
): Promise<void> {
  const userIds = await listParticipantUserIds(roomId);
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

  const participantUserIds = await listParticipantUserIds(roomId);

  if (isDbRoomSessionClosed(room) || room.status !== "live") {
    await deleteSessionRoomRedis(roomId);
    await Promise.all(participantUserIds.map((uid) => clearUserActiveRtcRoom(uid)));
    return { ended: false, alreadyClosed: true, reason };
  }

  const now = new Date();
  const preserveScheduledSlot = shouldPreserveScheduledSlot(room, reason, options);
  let transitioned = false;

  await db.transaction(async (tx) => {
    await tx
      .update(roomParticipants)
      .set({ leftAt: now, updatedAt: now })
      .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

    if (room.roomType === "circle" && preserveScheduledSlot) {
      const { expiresAt, isExpired } = computeRoomExpiryFields(
        {
          status: "scheduled",
          scheduledStartAt: room.scheduledStartAt,
          scheduledEndAt: room.scheduledEndAt,
          advancedOptions: room.advancedOptions,
        },
        now,
      );

      const [updated] = await tx
        .update(rooms)
        .set({
          status: "scheduled",
          endedAt: null,
          startedAt: null,
          rtcRoomId: null,
          expiresAt,
          isExpired,
          updatedAt: now,
        })
        .where(
          and(
            eq(rooms.id, roomId),
            eq(rooms.roomType, "circle"),
            eq(rooms.status, "live"),
          ),
        )
        .returning({ id: rooms.id });

      transitioned = Boolean(updated);

      if (updated) {
        await tx
          .update(roomParticipants)
          .set({ leftAt: null, updatedAt: now })
          .where(
            and(
              eq(roomParticipants.roomId, roomId),
              eq(roomParticipants.userId, room.hostUserId),
            ),
          );
      }
      return;
    }

    const [updated] = await tx
      .update(rooms)
      .set({
        status: "ended",
        endedAt: now,
        expiresAt: now,
        isExpired: true,
        updatedAt: now,
      })
      .where(
        and(eq(rooms.id, roomId), eq(rooms.status, "live")),
      )
      .returning({ id: rooms.id });

    transitioned = Boolean(updated);
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
      preserveScheduledSlot,
    });
  }

  return {
    ended: transitioned,
    alreadyClosed: !transitioned,
    reason,
  };
}
