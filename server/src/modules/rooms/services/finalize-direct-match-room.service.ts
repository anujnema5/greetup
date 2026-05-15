import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/core/database";
import { roomParticipants, rooms } from "@/core/database/schema";
import { deleteSessionRoomRedis } from "@/modules/rooms/services/session-room-redis.service";

/** Ends a live direct match room (DB + participants + `room:{id}` Redis). Idempotent. */
export async function finalizeDirectMatchRoomSession(roomId: string): Promise<void> {
  const row = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
    columns: { id: true, roomType: true, status: true },
  });

  if (!row || row.roomType !== "direct") {
    return;
  }

  if (row.status !== "live") {
    await deleteSessionRoomRedis(roomId);
    return;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(roomParticipants)
      .set({ leftAt: now, updatedAt: now })
      .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

    await tx
      .update(rooms)
      .set({
        status: "ended",
        endedAt: now,
        expiresAt: now,
        isExpired: true,
        updatedAt: now,
      })
      .where(and(eq(rooms.id, roomId), eq(rooms.roomType, "direct"), eq(rooms.status, "live")));
  });

  await deleteSessionRoomRedis(roomId);
}
