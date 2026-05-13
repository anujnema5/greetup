import { and, asc, eq, gte, inArray, isNotNull, isNull, ne, notExists, or, sql } from "drizzle-orm";

import { db } from "@/core/database";
import {
  mergeRoomAdvancedOptions,
  roomCategories,
  roomFriendInvites,
  roomParticipants,
  rooms,
  users,
  type RoomAdvancedOptions,
} from "@/core/database/schema";
import { computeRoomExpiryFields } from "@/modules/rooms/lib/room-expiry";
import type { RoomSessionType } from "@/shared/types/room-session";

export const roomsRepository = {
  async findUserDisplayLabel(userId: string): Promise<string> {
    const row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { displayName: true, name: true },
    });
    const displayName = row?.displayName?.trim();
    if (displayName) return displayName;
    const name = row?.name?.trim();
    return name || "Member";
  },

  async findRoomById(roomId: string) {
    return db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });
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

  async listActiveParticipantUserIds(roomId: string): Promise<string[]> {
    const rows = await db.query.roomParticipants.findMany({
      where: and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)),
      columns: { userId: true },
    });
    return rows.map((r) => r.userId);
  },

  async findRoomTitlesByIds(roomIds: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const unique = [...new Set(roomIds.filter((id) => id.length > 0))];
    if (unique.length === 0) return out;
    const titleRows = await db
      .select({ id: rooms.id, title: rooms.title })
      .from(rooms)
      .where(inArray(rooms.id, unique));
    for (const r of titleRows) {
      out.set(r.id, r.title);
    }
    return out;
  },

  /**
   * Marks a scheduled room as live and sets rtc_room_id to the same id for correlation with SFU/RTC.
   */
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

  /**
   * Marks circle rooms as expired when:
   * - `expires_at` is set and in the past, or
   * - still `scheduled` but `scheduled_start_at` is in the past (session never started).
   * Returns affected ids for Redis cleanup.
   */
  async syncPastDueCircleRoomExpiry(): Promise<string[]> {
    const rows = await db
      .update(rooms)
      .set({ isExpired: true, updatedAt: new Date() })
      .where(
        and(
          eq(rooms.roomType, "circle"),
          inArray(rooms.status, ["live", "scheduled"]),
          eq(rooms.isExpired, false),
          or(
            and(isNotNull(rooms.expiresAt), sql`${rooms.expiresAt} < NOW()`),
            and(
              eq(rooms.status, "scheduled"),
              isNotNull(rooms.scheduledStartAt),
              sql`${rooms.scheduledStartAt} < NOW()`,
            ),
          ),
        ),
      )
      .returning({ id: rooms.id });
    return rows.map((r) => r.id);
  },

  async updateLiveRoomTitle(roomId: string, title: string) {
    const [row] = await db
      .update(rooms)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(rooms.id, roomId), eq(rooms.status, "live")))
      .returning({ id: rooms.id });
    return row ?? null;
  },

  /**
   * Host-only: update a circle that is still `scheduled`. Recomputes expiry fields.
   */
  async updateScheduledCircleByHost(params: {
    roomId: string;
    hostUserId: string;
    title?: string;
    scheduledStartAt?: Date;
    scheduledEndAt?: Date | null;
  }): Promise<
    | { ok: true; id: string; title: string; scheduledStartAt: Date | null }
    | { ok: false; reason: "NOT_FOUND" | "INVALID_SCHEDULE" | "INVALID_END" }
  > {
    const room = await db.query.rooms.findFirst({
      where: and(eq(rooms.id, params.roomId), eq(rooms.hostUserId, params.hostUserId)),
      columns: {
        status: true,
        roomType: true,
        title: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        advancedOptions: true,
      },
    });

    if (!room || room.roomType !== "circle" || room.status !== "scheduled") {
      return { ok: false, reason: "NOT_FOUND" };
    }

    const nextTitle =
      params.title !== undefined ? params.title.trim() : room.title;
    const nextStart =
      params.scheduledStartAt !== undefined
        ? params.scheduledStartAt
        : room.scheduledStartAt;
    const nextEnd =
      params.scheduledEndAt !== undefined ? params.scheduledEndAt : room.scheduledEndAt;

    const now = new Date();
    if (!nextStart || nextStart <= now) {
      return { ok: false, reason: "INVALID_SCHEDULE" };
    }
    if (nextEnd && nextEnd <= nextStart) {
      return { ok: false, reason: "INVALID_END" };
    }

    const { expiresAt, isExpired } = computeRoomExpiryFields({
      status: "scheduled",
      scheduledStartAt: nextStart,
      scheduledEndAt: nextEnd,
      advancedOptions: room.advancedOptions,
    });

    const [row] = await db
      .update(rooms)
      .set({
        title: nextTitle,
        scheduledStartAt: nextStart,
        scheduledEndAt: nextEnd,
        expiresAt,
        isExpired,
        updatedAt: new Date(),
      })
      .where(and(eq(rooms.id, params.roomId), eq(rooms.status, "scheduled")))
      .returning({
        id: rooms.id,
        title: rooms.title,
        scheduledStartAt: rooms.scheduledStartAt,
      });

    if (!row) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    return { ok: true, ...row };
  },

  /** Pending/accepted friend invites for a room (e.g. notify invitees when session goes live). */
  async listActiveFriendInviteeUserIds(roomId: string) {
    return db.query.roomFriendInvites.findMany({
      where: and(
        eq(roomFriendInvites.roomId, roomId),
        inArray(roomFriendInvites.status, ["pending", "accepted"]),
      ),
      columns: {
        inviteeUserId: true,
      },
    });
  },

  async findActiveCategoryById(categoryId: string) {
    return db.query.roomCategories.findFirst({
      where: and(
        eq(roomCategories.id, categoryId),
        eq(roomCategories.isActive, true),
      ),
    });
  },

  async findActiveCategoryBySlug(slug: string) {
    return db.query.roomCategories.findFirst({
      where: and(eq(roomCategories.slug, slug), eq(roomCategories.isActive, true)),
      columns: { id: true },
    });
  },

  /**
   * Persists a 1:1 match-engine room (same id as Redis) with host + peer participants.
   */
  async createMatchPairRoom(params: {
    roomId: string;
    hostUserId: string;
    peerUserId: string;
    categoryId: string;
  }) {
    const now = new Date();
    const advancedOptions = mergeRoomAdvancedOptions(null);

    await db.transaction(async (tx) => {
      await tx.insert(rooms).values({
        id: params.roomId,
        categoryId: params.categoryId,
        hostUserId: params.hostUserId,
        title: "Match",
        description: null,
        visibility: "private",
        maxParticipants: 2,
        scheduledStartAt: null,
        scheduledEndAt: null,
        status: "live",
        startedAt: now,
        endedAt: null,
        expiresAt: null,
        isExpired: false,
        rtcRoomId: params.roomId,
        inviteCode: null,
        advancedOptions,
        roomType: "direct",
      });

      await tx.insert(roomParticipants).values([
        {
          roomId: params.roomId,
          userId: params.hostUserId,
          role: "host",
        },
        {
          roomId: params.roomId,
          userId: params.peerUserId,
          role: "participant",
        },
      ]);
    });

    return params.roomId;
  },

  async listActiveCategories() {
    return db.query.roomCategories.findMany({
      where: eq(roomCategories.isActive, true),
      orderBy: [asc(roomCategories.sortOrder), asc(roomCategories.displayName)],
      columns: {
        id: true,
        slug: true,
        displayName: true,
        emoji: true,
        description: true,
        sortOrder: true,
      },
    });
  },

  /**
   * Creates room, host row, and friend invites in one transaction.
   * Invites use ON CONFLICT DO NOTHING on (room_id, invitee_user_id) to tolerate duplicate IDs in the payload.
   */
  async createRoomWithHostAndInvites(params: {
    categoryId: string;
    hostUserId: string;
    title: string;
    description: string | null;
    visibility: "private" | "public";
    maxParticipants: number;
    scheduledStartAt: Date | null;
    scheduledEndAt: Date | null;
    status: "scheduled" | "live" | "ended" | "cancelled";
    startedAt: Date | null;
    inviteCode: string | null;
    advancedOptions: RoomAdvancedOptions;
    inviteeUserIds: string[];
    roomType: RoomSessionType;
  }) {
    return db.transaction(async (tx) => {
      const { expiresAt, isExpired } = computeRoomExpiryFields({
        status: params.status,
        scheduledStartAt: params.scheduledStartAt,
        scheduledEndAt: params.scheduledEndAt,
        advancedOptions: params.advancedOptions,
      });

      const [row] = await tx
        .insert(rooms)
        .values({
          categoryId: params.categoryId,
          hostUserId: params.hostUserId,
          title: params.title,
          description: params.description,
          visibility: params.visibility,
          maxParticipants: params.maxParticipants,
          scheduledStartAt: params.scheduledStartAt,
          scheduledEndAt: params.scheduledEndAt,
          status: params.status,
          startedAt: params.startedAt,
          endedAt: null,
          expiresAt,
          isExpired,
          rtcRoomId: null,
          inviteCode: params.inviteCode,
          advancedOptions: params.advancedOptions,
          roomType: params.roomType,
        })
        .returning({
          id: rooms.id,
          status: rooms.status,
          inviteCode: rooms.inviteCode,
          scheduledStartAt: rooms.scheduledStartAt,
          startedAt: rooms.startedAt,
          roomType: rooms.roomType,
        });

      if (!row) {
        throw new Error("Failed to create room");
      }

      if (params.status === "live") {
        await tx
          .update(rooms)
          .set({ rtcRoomId: row.id })
          .where(eq(rooms.id, row.id));
      }

      await tx.insert(roomParticipants).values({
        roomId: row.id,
        userId: params.hostUserId,
        role: "host",
      });

      if (params.inviteeUserIds.length > 0) {
        await tx
          .insert(roomFriendInvites)
          .values(
            params.inviteeUserIds.map((inviteeUserId) => ({
              roomId: row.id,
              inviterUserId: params.hostUserId,
              inviteeUserId,
              status: "pending" as const,
            })),
          )
          .onConflictDoNothing({
            target: [roomFriendInvites.roomId, roomFriendInvites.inviteeUserId],
          });
      }

      return row;
    });
  },

  /** Subquery for active participant count on a room — reused across list queries. */
  _participantCountSq() {
    return sql<number>`(
      SELECT CAST(COUNT(*) AS int) FROM room_participants rpc
      WHERE rpc.room_id = ${rooms.id} AND rpc.left_at IS NULL
    )`;
  },

  _activeCircleListingPredicate() {
    return and(
      eq(rooms.isExpired, false),
      or(isNull(rooms.expiresAt), gte(rooms.expiresAt, sql`NOW()`)),
      or(
        ne(rooms.status, "scheduled"),
        isNull(rooms.scheduledStartAt),
        gte(rooms.scheduledStartAt, sql`NOW()`),
      ),
    );
  },

  /** Shared column projection for the active-circles list. */
  _activeCircleColumns() {
    return {
      id: rooms.id,
      title: rooms.title,
      status: rooms.status,
      visibility: rooms.visibility,
      maxParticipants: rooms.maxParticipants,
      scheduledStartAt: rooms.scheduledStartAt,
      startedAt: rooms.startedAt,
      expiresAt: rooms.expiresAt,
      isExpired: rooms.isExpired,
      roomType: rooms.roomType,
      hostUserId: rooms.hostUserId,
      categoryId: roomCategories.id,
      categorySlug: roomCategories.slug,
      categoryDisplayName: roomCategories.displayName,
      categoryEmoji: roomCategories.emoji,
      hostName: users.name,
      hostDisplayName: users.displayName,
      participantCount: roomsRepository._participantCountSq(),
    } as const;
  },

  /**
   * Rooms where the caller has a pending/accepted friend invite (circle type, active only).
   */
  async listFriendInvitedCircles(userId: string) {
    return db
      .select({
        ...roomsRepository._activeCircleColumns(),
        inviteStatus: roomFriendInvites.status,
      })
      .from(rooms)
      .innerJoin(roomCategories, eq(rooms.categoryId, roomCategories.id))
      .innerJoin(users, eq(rooms.hostUserId, users.id))
      .innerJoin(
        roomFriendInvites,
        and(
          eq(roomFriendInvites.roomId, rooms.id),
          eq(roomFriendInvites.inviteeUserId, userId),
          inArray(roomFriendInvites.status, ["pending", "accepted"]),
        ),
      )
      .where(
        and(
          eq(rooms.roomType, "circle"),
          inArray(rooms.status, ["live", "scheduled"]),
          roomsRepository._activeCircleListingPredicate(),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${rooms.status} = 'live' THEN 0 ELSE 1 END`,
        asc(rooms.scheduledStartAt),
      );
  },

  /**
   * Rooms where the caller is a participant but has no friend invite (circle type, active only).
   */
  async listJoinedCircles(userId: string) {
    const friendInviteExists = db
      .select({ one: sql<number>`1` })
      .from(roomFriendInvites)
      .where(
        and(
          eq(roomFriendInvites.roomId, rooms.id),
          eq(roomFriendInvites.inviteeUserId, userId),
        ),
      );

    return db
      .select(roomsRepository._activeCircleColumns())
      .from(rooms)
      .innerJoin(roomCategories, eq(rooms.categoryId, roomCategories.id))
      .innerJoin(users, eq(rooms.hostUserId, users.id))
      .innerJoin(
        roomParticipants,
        and(
          eq(roomParticipants.roomId, rooms.id),
          eq(roomParticipants.userId, userId),
          isNull(roomParticipants.leftAt),
        ),
      )
      .where(
        and(
          eq(rooms.roomType, "circle"),
          inArray(rooms.status, ["live", "scheduled"]),
          notExists(friendInviteExists),
          roomsRepository._activeCircleListingPredicate(),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${rooms.status} = 'live' THEN 0 ELSE 1 END`,
        asc(rooms.scheduledStartAt),
      );
  },

  /**
   * Public circles not already in friend-invited or joined lists, cursor-paginated.
   * Returns `limit + 1` rows so the caller can detect `hasMore`.
   */
  async listPublicCircles(userId: string, limit: number, cursor?: string) {
    const friendInviteExists = db
      .select({ one: sql<number>`1` })
      .from(roomFriendInvites)
      .where(
        and(
          eq(roomFriendInvites.roomId, rooms.id),
          eq(roomFriendInvites.inviteeUserId, userId),
        ),
      );

    const participantExists = db
      .select({ one: sql<number>`1` })
      .from(roomParticipants)
      .where(
        and(
          eq(roomParticipants.roomId, rooms.id),
          eq(roomParticipants.userId, userId),
        ),
      );

    const cursorClause = cursor
      ? sql`(
          CASE WHEN ${rooms.status} = 'live' THEN 0 ELSE 1 END,
          COALESCE(${rooms.scheduledStartAt}, '9999-01-01'::timestamptz),
          ${rooms.id}
        ) > (
          SELECT
            CASE WHEN r2.status = 'live' THEN 0 ELSE 1 END,
            COALESCE(r2.scheduled_start_at, '9999-01-01'::timestamptz),
            r2.id
          FROM rooms r2
          WHERE r2.id = ${cursor}
        )`
      : undefined;

    return db
      .select(roomsRepository._activeCircleColumns())
      .from(rooms)
      .innerJoin(roomCategories, eq(rooms.categoryId, roomCategories.id))
      .innerJoin(users, eq(rooms.hostUserId, users.id))
      .where(
        and(
          eq(rooms.roomType, "circle"),
          inArray(rooms.status, ["live", "scheduled"]),
          eq(rooms.visibility, "public"),
          notExists(friendInviteExists),
          notExists(participantExists),
          roomsRepository._activeCircleListingPredicate(),
          cursorClause,
        ),
      )
      .orderBy(
        sql`CASE WHEN ${rooms.status} = 'live' THEN 0 ELSE 1 END`,
        asc(rooms.scheduledStartAt),
        asc(rooms.id),
      )
      .limit(limit + 1);
  },
};
