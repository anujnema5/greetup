import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/core/database";
import { roomParticipants, rooms } from "@/core/database/schema";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/room-expiry";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/session-room-redis.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/user-active-rtc-room-redis.service";

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
 * Host-only: marks every active participant as departed, ends the live circle row, and clears
 * `room:{id}` Redis. `deleteCircleAfterCall` only affects auto-end on last participant leave, not
 * this explicit action.
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

  await db.transaction(async (tx) => {
    await tx
      .update(roomParticipants)
      .set({ leftAt: now, updatedAt: now })
      .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

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
  });

  await deleteSessionRoomRedis(roomId);
  await clearUserActiveRtcRoom(userId);
  return { roomEnded, alreadyEnded: false };
}
