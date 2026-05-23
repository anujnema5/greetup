import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/core/database";
import { roomParticipants, rooms } from "@/core/database/schema";

export const roomParticipantsRepository = {
  async isUserRoomParticipant(roomId: string, userId: string) {
    const row = await db.query.roomParticipants.findFirst({
      where: and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, userId),
        isNull(roomParticipants.leftAt),
      ),
      columns: { id: true },
    });
    return !!row;
  },

  /** Whether the user has ever been a participant in this room (regardless of leftAt). */
  async wasUserRoomParticipant(roomId: string, userId: string) {
    const row = await db.query.roomParticipants.findFirst({
      where: and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, userId),
      ),
      columns: { id: true },
    });
    return !!row;
  },

  /** Returns the participant row for a user in a room (any status), or undefined. */
  async findRoomParticipant(roomId: string, userId: string) {
    return db.query.roomParticipants.findFirst({
      where: and(
        eq(roomParticipants.roomId, roomId),
        eq(roomParticipants.userId, userId),
      ),
      columns: { role: true, leftAt: true },
    });
  },

  /** Count of active (non-left) participants in a room. */
  async countActiveParticipants(roomId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`cast(count(*) as int)` })
      .from(roomParticipants)
      .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));
    return row?.n ?? 0;
  },

  /** Add a participant row or reactivate an existing one (clear leftAt). */
  async addOrReactivateParticipantRow(roomId: string, userId: string): Promise<void> {
    const now = new Date();
    await db
      .insert(roomParticipants)
      .values({
        roomId,
        userId,
        role: "participant",
        joinedAt: now,
      })
      .onConflictDoUpdate({
        target: [roomParticipants.roomId, roomParticipants.userId],
        set: {
          leftAt: null,
          joinedAt: now,
          updatedAt: now,
        },
      });
  },

  /** Add a host row or reactivate an existing one (clear leftAt, set role=host). */
  async addOrReactivateHostRow(roomId: string, userId: string): Promise<void> {
    const now = new Date();
    await db
      .insert(roomParticipants)
      .values({
        roomId,
        userId,
        role: "host",
        joinedAt: now,
      })
      .onConflictDoUpdate({
        target: [roomParticipants.roomId, roomParticipants.userId],
        set: {
          leftAt: null,
          joinedAt: now,
          updatedAt: now,
          role: "host",
        },
      });
  },

  async listActiveParticipantUserIds(roomId: string): Promise<string[]> {
    const rows = await db.query.roomParticipants.findMany({
      where: and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)),
      columns: { userId: true },
    });
    return rows.map((r) => r.userId);
  },

  /** Mark a participant as having left the room (set leftAt = now). */
  async markParticipantLeft(roomId: string, userId: string): Promise<void> {
    const now = new Date();
    await db
      .update(roomParticipants)
      .set({ leftAt: now, updatedAt: now })
      .where(
        and(
          eq(roomParticipants.roomId, roomId),
          eq(roomParticipants.userId, userId),
          isNull(roomParticipants.leftAt),
        ),
      );
  },

  /** List all user IDs that have ever been a participant in this room (including those who left). */
  async listAllParticipantUserIds(roomId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: roomParticipants.userId })
      .from(roomParticipants)
      .where(eq(roomParticipants.roomId, roomId));
    return [...new Set(rows.map((r) => r.userId))];
  },

  async findLiveDirectRoomIdForParticipant(userId: string): Promise<string | null> {
    const row = await db
      .select({ roomId: roomParticipants.roomId })
      .from(roomParticipants)
      .innerJoin(rooms, eq(rooms.id, roomParticipants.roomId))
      .where(
        and(
          eq(roomParticipants.userId, userId),
          isNull(roomParticipants.leftAt),
          eq(rooms.roomType, "direct"),
          eq(rooms.status, "live"),
        ),
      )
      .limit(1);
    return row[0]?.roomId ?? null;
  },
};
