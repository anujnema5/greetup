import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/core/database";
import { roomParticipants, rooms } from "@/core/database/schema";
import { emitToUser } from "@/core/socket/socket";
import { computeRoomExpiryFields, isDbRoomSessionClosed } from "@/modules/rooms/lib/room-expiry";
import { CIRCLE_ROOM_SOCKET_EVENTS } from "@/modules/rooms/constants/circle-room-socket.events";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { notifyRtcServiceSfuRoomTeardown } from "@/modules/rooms/services/rtc-sfu-room-teardown.service";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/session-room-redis.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/user-active-rtc-room-redis.service";

async function emitHostEndedCircleToOtherParticipants(roomId: string, hostUserId: string) {
  const rows = await db
    .select({ userId: roomParticipants.userId })
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, roomId));
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const payload = { roomId };
  for (const uid of userIds) {
    if (uid === hostUserId) continue;
    emitToUser(uid, CIRCLE_ROOM_SOCKET_EVENTS.hostEndedForEveryone, payload);
  }
}

export type HostEndCircleForEveryoneErrorCode = "ROOM_NOT_FOUND" | "NOT_HOST" | "INVALID_STATE";

export class HostEndCircleForEveryoneError extends Error {
  constructor(
    message: string,
    public readonly code: HostEndCircleForEveryoneErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "HostEndCircleForEveryoneError";
  }
}

/**
 * Host-only: disconnects everyone, clears main `room:{id}` Redis, updates Postgres, and on a
 * successful live→ended/scheduled transition asks rtc-service to tear down the SFU room for `roomId`.
 *
 * - **Scheduled calendar circles** (`scheduled_start_at` set): returns the row to `scheduled`
 *   with the same slot and recomputed `expires_at` / `is_expired` — the call ends but the event
 *   is not deleted or expired for listing.
 * - **Instant / no calendar start**: marks the circle `ended` + expired (previous behavior).
 *
 * `deleteCircleAfterCall` only affects auto-end on last participant leave, not this action.
 */
export async function hostEndCircleForEveryoneService(
  userId: string,
  roomId: string,
): Promise<{ roomEnded: boolean; alreadyEnded: boolean }> {
  const room = await roomsRepository.findRoomById(roomId);
  if (!room || room.roomType !== "circle") {
    throw new HostEndCircleForEveryoneError("Room not found", "ROOM_NOT_FOUND", 404);
  }
  if (room.hostUserId !== userId) {
    throw new HostEndCircleForEveryoneError(
      "Only the host can end this circle for everyone",
      "NOT_HOST",
      403,
    );
  }

  if (isDbRoomSessionClosed(room)) {
    await deleteSessionRoomRedis(roomId);
    await clearUserActiveRtcRoom(userId);
    return { roomEnded: false, alreadyEnded: true };
  }

  if (room.status !== "live") {
    throw new HostEndCircleForEveryoneError("Room is not live", "INVALID_STATE", 400);
  }

  const now = new Date();
  let roomEnded = false;
  const revertToScheduledSlot = room.scheduledStartAt != null;

  await db.transaction(async (tx) => {
    await tx
      .update(roomParticipants)
      .set({ leftAt: now, updatedAt: now })
      .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

    if (revertToScheduledSlot) {
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
        .where(and(eq(rooms.id, roomId), eq(rooms.roomType, "circle"), eq(rooms.status, "live")))
        .returning({ id: rooms.id });
      roomEnded = Boolean(updated);

      if (updated) {
        await tx
          .update(roomParticipants)
          .set({ leftAt: null, updatedAt: now })
          .where(
            and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, room.hostUserId)),
          );
      }
    } else {
      const [updated] = await tx
        .update(rooms)
        .set({
          status: "ended",
          endedAt: now,
          expiresAt: now,
          isExpired: true,
          updatedAt: now,
        })
        .where(and(eq(rooms.id, roomId), eq(rooms.roomType, "circle"), eq(rooms.status, "live")))
        .returning({ id: rooms.id });
      roomEnded = Boolean(updated);
    }
  });

  await deleteSessionRoomRedis(roomId);
  await clearUserActiveRtcRoom(userId);

  if (roomEnded) {
    await notifyRtcServiceSfuRoomTeardown(roomId);
    await emitHostEndedCircleToOtherParticipants(roomId, room.hostUserId);
  }

  return { roomEnded, alreadyEnded: false };
}
