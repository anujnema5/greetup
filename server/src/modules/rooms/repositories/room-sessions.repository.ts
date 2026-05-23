import { and, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db } from "@/core/database";
import {
  roomParticipants,
  rooms,
  type RoomAdvancedOptions,
} from "@/core/database/schema";
import { coerceRoomDate } from "@/modules/rooms/lib/session/coerce-room-date";
import {
  computeLiveSessionExpiresAt,
  computeRoomExpiryFields,
} from "@/modules/rooms/lib/expiry/room-expiry";
import {
  CIRCLE_SESSION_MAX_MINUTES,
  DIRECT_SESSION_MAX_MINUTES,
  SCHEDULED_EMPTY_ROOM_GRACE_MINUTES,
} from "@/modules/rooms/constants/session/room-session-limits";
import { SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES } from "@/modules/rooms/constants/session/scheduled-circle-join-grace";

function roomSessionSweepCandidatesWhere() {
  return or(
    and(
      eq(rooms.roomType, "circle"),
      eq(rooms.status, "scheduled"),
      isNotNull(rooms.scheduledStartAt),
      sql`(${rooms.scheduledStartAt} + (${SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES} * interval '1 minute')) <= NOW()`,
    ),
    and(
      eq(rooms.status, "live"),
      inArray(rooms.roomType, ["direct", "circle"]),
      or(
        eq(rooms.isExpired, true),
        and(isNotNull(rooms.expiresAt), sql`${rooms.expiresAt} <= NOW()`),
        and(
          isNotNull(rooms.startedAt),
          sql`(
            (${rooms.roomType} = 'direct' AND ${rooms.startedAt} + (${DIRECT_SESSION_MAX_MINUTES} * interval '1 minute') <= NOW())
            OR (${rooms.roomType} = 'circle' AND ${rooms.startedAt} + (${CIRCLE_SESSION_MAX_MINUTES} * interval '1 minute') <= NOW())
          )`,
        ),
        and(
          sql`NOT EXISTS (
            SELECT 1 FROM ${roomParticipants} rp
            WHERE rp.room_id = ${rooms.id} AND rp.left_at IS NULL
          )`,
          sql`(
            COALESCE(
              (SELECT MAX(rp.left_at) FROM ${roomParticipants} rp WHERE rp.room_id = ${rooms.id}),
              ${rooms.startedAt}
            ) + (${SCHEDULED_EMPTY_ROOM_GRACE_MINUTES} * interval '1 minute')
          ) <= NOW()`,
          or(isNull(rooms.scheduledStartAt), sql`${rooms.scheduledStartAt} <= NOW()`),
        ),
      ),
    ),
  );
}

function circleRoomsPastDueForSyncWhere() {
  return and(
    eq(rooms.roomType, "circle"),
    inArray(rooms.status, ["live", "scheduled"]),
    eq(rooms.isExpired, false),
    or(
      and(isNotNull(rooms.expiresAt), sql`${rooms.expiresAt} < NOW()`),
      and(
        eq(rooms.status, "scheduled"),
        isNotNull(rooms.scheduledStartAt),
        sql`(${rooms.scheduledStartAt} + (${SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES} * interval '1 minute')) < NOW()`,
      ),
    ),
  );
}

export const roomSessionsRepository = {
  async markRoomLive(roomId: string, startedAt: Date) {
    const existing = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.status, "scheduled")),
      columns: {
        scheduledStartAt: true,
        scheduledEndAt: true,
        advancedOptions: true,
      },
    });
    if (!existing) return null;

    const { expiresAt, isExpired } = computeRoomExpiryFields({
      status: "live",
      scheduledStartAt: existing.scheduledStartAt,
      scheduledEndAt: existing.scheduledEndAt,
      advancedOptions: existing.advancedOptions,
    });

    const [row] = await db
      .update(rooms)
      .set({
        status: "live",
        startedAt,
        rtcRoomId: roomId,
        updatedAt: new Date(),
        expiresAt,
        isExpired,
      })
      .where(and(eq(rooms.id, roomId), eq(rooms.status, "scheduled")))
      .returning({
        id: rooms.id,
        status: rooms.status,
        inviteCode: rooms.inviteCode,
        scheduledStartAt: rooms.scheduledStartAt,
        startedAt: rooms.startedAt,
        roomType: rooms.roomType,
      });

    return row ?? null;
  },

  async syncPastDueCircleRoomExpiry(): Promise<string[]> {
    const rows = await db
      .update(rooms)
      .set({ isExpired: true, updatedAt: new Date() })
      .where(circleRoomsPastDueForSyncWhere())
      .returning({ id: rooms.id });
    return rows.map((r) => r.id);
  },

  async syncCircleRoomExpiryIfPastDue(roomId: string): Promise<boolean> {
    const rows = await db
      .update(rooms)
      .set({ isExpired: true, updatedAt: new Date() })
      .where(and(eq(rooms.id, roomId), circleRoomsPastDueForSyncWhere()))
      .returning({ id: rooms.id });
    return rows.length > 0;
  },

  async listRoomIdsDueForSessionSweep(limit = 100): Promise<string[]> {
    const rows = await db
      .select({ id: rooms.id })
      .from(rooms)
      .where(roomSessionSweepCandidatesWhere())
      .limit(limit);
    return rows.map((r) => r.id);
  },

  async restartLiveSessionClockIfNoActiveParticipants(roomId: string): Promise<void> {
    const row = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.status, "live")),
      columns: {
        roomType: true,
        startedAt: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        advancedOptions: true,
      },
    });
    if (!row) return;

    const [countRow] = await db
      .select({ n: sql<number>`cast(count(*) as int)` })
      .from(roomParticipants)
      .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));
    if ((countRow?.n ?? 0) > 0) return;

    const now = new Date();
    const expiresAt = computeLiveSessionExpiresAt({
      roomType: row.roomType,
      status: "live",
      startedAt: now,
      scheduledStartAt: row.scheduledStartAt,
      scheduledEndAt: row.scheduledEndAt,
      advancedOptions: row.advancedOptions,
    });

    await db
      .update(rooms)
      .set({
        startedAt: now,
        expiresAt,
        isExpired: false,
        updatedAt: now,
      })
      .where(eq(rooms.id, roomId));
  },

  async refreshLiveCircleExpiryAfterParticipantJoin(roomId: string): Promise<void> {
    const row = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, roomId), eq(rooms.roomType, "circle"), eq(rooms.status, "live")),
      columns: {
        scheduledStartAt: true,
        scheduledEndAt: true,
        advancedOptions: true,
      },
    });
    if (!row) return;

    const { expiresAt, isExpired } = computeRoomExpiryFields({
      status: "live",
      scheduledStartAt: row.scheduledStartAt,
      scheduledEndAt: row.scheduledEndAt,
      advancedOptions: row.advancedOptions,
    });

    await db
      .update(rooms)
      .set({ expiresAt, isExpired, updatedAt: new Date() })
      .where(and(eq(rooms.id, roomId), eq(rooms.roomType, "circle"), eq(rooms.status, "live")));
  },

  async loadParticipantPresence(roomId: string) {
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
  },

  async expireScheduledJoinGraceMissed(roomId: string): Promise<boolean> {
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
    return Boolean(row);
  },

  async endLiveRoomSessionTx(params: {
    roomId: string;
    now: Date;
    roomType: string;
    hostUserId: string;
    preserveScheduledSlot: boolean;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    advancedOptions: RoomAdvancedOptions | null;
  }): Promise<{ transitioned: boolean }> {
    const { roomId, now, roomType, hostUserId, preserveScheduledSlot } = params;

    return db.transaction(async (tx) => {
      await tx
        .update(roomParticipants)
        .set({ leftAt: now, updatedAt: now })
        .where(and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)));

      if (roomType === "circle" && preserveScheduledSlot) {
        const { expiresAt, isExpired } = computeRoomExpiryFields(
          {
            status: "scheduled",
            scheduledStartAt: params.scheduledStartAt,
            scheduledEndAt: params.scheduledEndAt,
            advancedOptions: params.advancedOptions,
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

        if (updated) {
          await tx
            .update(roomParticipants)
            .set({ leftAt: null, updatedAt: now })
            .where(
              and(
                eq(roomParticipants.roomId, roomId),
                eq(roomParticipants.userId, hostUserId),
              ),
            );
        }
        return { transitioned: Boolean(updated) };
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

      return { transitioned: Boolean(updated) };
    });
  },

  async leaveAndMaybeEndRoomTx(
    roomId: string,
    userId: string,
    now: Date,
    deleteCircleAfterCall: boolean,
  ): Promise<{ lastParticipantLeft: boolean; roomEnded: boolean }> {
    let lastParticipantLeft = false;
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
      if (activeLeft > 0) return;

      lastParticipantLeft = true;

      if (deleteCircleAfterCall) {
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

    return { lastParticipantLeft, roomEnded };
  },
};
