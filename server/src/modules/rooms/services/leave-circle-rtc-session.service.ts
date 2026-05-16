import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { mergeRoomAdvancedOptions, roomParticipants, rooms } from "@/core/database/schema";
import logger from "@/core/logging";
import { isDbRoomSessionClosed } from "@/modules/rooms/lib/room-expiry";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/session-room-redis.service";
import { clearUserActiveRtcRoom } from "@/modules/rooms/services/user-active-rtc-room-redis.service";

export type LeaveCircleRtcErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_NOT_LIVE"
  | "NOT_ACTIVE_PARTICIPANT";

export class LeaveCircleRtcError extends Error {
  constructor(
    message: string,
    public readonly code: LeaveCircleRtcErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "LeaveCircleRtcError";
  }
}

/**
 * Records the caller as departed from a live DB circle (`leftAt`). If nobody remains:
 * - `deleteCircleAfterCall`: end the circle immediately and clear Redis (opt-in one-shot circles).
 * - Else: **do not** change `rooms.status`, `expires_at`, or `is_expired` — the circle stays live
 *   for rejoin until the host uses **end circle for everyone** or wall-clock expiry from the
 *   original schedule (`expires_at` / `syncPastDueCircleRoomExpiry`).
 */
export async function leaveCircleRtcSessionForUser(
  userId: string,
  roomId: string,
  options: { httpStrict?: boolean } = {},
): Promise<{ roomEnded: boolean }> {
  const httpStrict = options.httpStrict ?? false;
  const room = await roomsRepository.findRoomById(roomId);

  if (!room || room.roomType !== "circle") {
    if (httpStrict) {
      throw new LeaveCircleRtcError("Room not found", "ROOM_NOT_FOUND", 404);
    }
    return { roomEnded: false };
  }

  if (isDbRoomSessionClosed(room)) {
    await deleteSessionRoomRedis(roomId);
    await clearUserActiveRtcRoom(userId);
    return { roomEnded: false };
  }

  if (room.status !== "live") {
    if (httpStrict) {
      throw new LeaveCircleRtcError("Room is not live", "ROOM_NOT_LIVE", 400);
    }
    await clearUserActiveRtcRoom(userId);
    return { roomEnded: false };
  }

  const adv = mergeRoomAdvancedOptions(room.advancedOptions);

  const activeBefore = await db.query.roomParticipants.findFirst({
    where: and(
      eq(roomParticipants.roomId, roomId),
      eq(roomParticipants.userId, userId),
      isNull(roomParticipants.leftAt),
    ),
    columns: { id: true },
  });

  if (!activeBefore) {
    await clearUserActiveRtcRoom(userId);
    if (httpStrict) {
      const anyRow = await db.query.roomParticipants.findFirst({
        where: and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, userId)),
        columns: { id: true },
      });
      if (!anyRow) {
        throw new LeaveCircleRtcError(
          "You are not in this call",
          "NOT_ACTIVE_PARTICIPANT",
          403,
        );
      }
    }
    return { roomEnded: false };
  }

  const now = new Date();
  let roomEnded = false;

  await db.transaction(async (tx) => {
    await tx
      .update(roomParticipants)
      .set({ leftAt: now, updatedAt: now })
      .where(
        and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.userId, userId),
          isNull(roomParticipants.leftAt),
        ),
      );

    const [countRow] = await tx
      .select({ n: sql<number>`cast(count(*) as int)` })
      .from(roomParticipants)
      .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

    const activeLeft = countRow?.n ?? 0;
    if (activeLeft > 0) {
      return;
    }

    if (adv.deleteCircleAfterCall) {
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

  await clearUserActiveRtcRoom(userId);
  if (roomEnded) {
    await deleteSessionRoomRedis(roomId);
  }
  return { roomEnded };
}

/** Matchmaking / keepalive paths: never throw; best-effort circle cleanup. */
export async function leaveCircleRtcSessionInternal(userId: string, roomId: string): Promise<void> {
  try {
    await leaveCircleRtcSessionForUser(userId, roomId, { httpStrict: false });
  } catch (err) {
    logger.warn("leaveCircleRtcSessionInternal failed", {
      userId,
      roomId,
      err: String(err),
    });
  }
}
