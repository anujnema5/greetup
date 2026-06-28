import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  notExists,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/core/database";
import {
  roomCategories,
  roomFriendInvites,
  roomParticipants,
  roomRestrictedUsers,
  rooms,
  users,
} from "@/core/database/schema";

function participantCountSq() {
  return sql<number>`(
    SELECT CAST(COUNT(*) AS int) FROM room_participants rpc
    WHERE rpc.room_id = ${rooms.id} AND rpc.left_at IS NULL
  )`;
}

/**
 * Active Circles dashboard / browse listings.
 *
 * Scheduled circles stay visible after `scheduled_start_at` until `is_expired` /
 * `expires_at` — hosts use “Start now” during the join-grace window. Do not require
 * `scheduled_start_at >= NOW()` here (that hid past-slot circles from the host).
 */
function activeSpaceListingPredicate() {
  return and(
    eq(rooms.isExpired, false),
    or(isNull(rooms.expiresAt), gte(rooms.expiresAt, sql`NOW()`)),
  );
}

function activeSpaceColumns() {
  return {
    id: rooms.id,
    title: rooms.title,
    status: rooms.status,
    visibility: rooms.visibility,
    maxParticipants: rooms.maxParticipants,
    description: rooms.description,
    advancedOptions: rooms.advancedOptions,
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
    participantCount: participantCountSq(),
    pendingInviteeIds: sql<
      string[] | null
    >`(select coalesce(array_agg(invitee_user_id::text), array[]::text[]) from room_friend_invites where room_id = ${rooms.id} and status = 'pending')`,
  } as const;
}

export const activeSpacesListingsRepository = {
  /**
   * Rooms where the caller has a pending/accepted friend invite (circle type, active only).
   * {@link listActiveSpacesService} drops rows that already appear in {@link listJoinedSpaces}.
   */
  async listFriendInvitedSpaces(userId: string) {
    return db
      .select({
        ...activeSpaceColumns(),
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
          eq(rooms.roomType, "space"),
          inArray(rooms.status, ["live", "scheduled"]),
          activeSpaceListingPredicate(),
        ),
      )
      .orderBy(
        sql`CASE WHEN ${rooms.status} = 'live' THEN 0 ELSE 1 END`,
        asc(rooms.scheduledStartAt),
      );
  },

  /**
   * Circles the caller should see under “joined”: active in-call membership **or** they host the
   * room (so leaving RTC does not hide a future / still-live space from their dashboard).
   */
  async listJoinedSpaces(userId: string) {
    const restrictedExists = db
      .select({ one: sql<number>`1` })
      .from(roomRestrictedUsers)
      .where(
        and(
          eq(roomRestrictedUsers.roomId, rooms.id),
          eq(roomRestrictedUsers.userId, userId),
        ),
      );

    return db
      .select(activeSpaceColumns())
      .from(rooms)
      .innerJoin(roomCategories, eq(rooms.categoryId, roomCategories.id))
      .innerJoin(users, eq(rooms.hostUserId, users.id))
      .leftJoin(
        roomParticipants,
        and(eq(roomParticipants.roomId, rooms.id), eq(roomParticipants.userId, userId)),
      )
      .where(
        and(
          eq(rooms.roomType, "space"),
          inArray(rooms.status, ["live", "scheduled"]),
          notExists(restrictedExists),
          activeSpaceListingPredicate(),
          or(
            eq(rooms.hostUserId, userId),
            and(isNotNull(roomParticipants.userId), isNull(roomParticipants.leftAt)),
            and(
              isNotNull(roomParticipants.userId),
              isNotNull(roomParticipants.leftAt),
              inArray(rooms.status, ["live", "scheduled"]),
            ),
          ),
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
  async listPublicSpaces(userId: string, limit: number, cursor?: string) {
    const friendInviteExists = db
      .select({ one: sql<number>`1` })
      .from(roomFriendInvites)
      .where(
        and(
          eq(roomFriendInvites.roomId, rooms.id),
          eq(roomFriendInvites.inviteeUserId, userId),
          inArray(roomFriendInvites.status, ["pending", "accepted"]),
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
      .select(activeSpaceColumns())
      .from(rooms)
      .innerJoin(roomCategories, eq(rooms.categoryId, roomCategories.id))
      .innerJoin(users, eq(rooms.hostUserId, users.id))
      .where(
        and(
          eq(rooms.roomType, "space"),
          inArray(rooms.status, ["live", "scheduled"]),
          eq(rooms.visibility, "public"),
          notExists(friendInviteExists),
          notExists(participantExists),
          activeSpaceListingPredicate(),
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

  /** Public live + scheduled circles per category (Explore niche browse tiles). */
  async countPublicSpacesByCategoryAndStatus() {
    return db
      .select({
        categoryId: roomCategories.id,
        liveGroupCount: sql<number>`CAST(SUM(CASE WHEN ${rooms.status} = 'live' THEN 1 ELSE 0 END) AS int)`,
        scheduledGroupCount: sql<number>`CAST(SUM(CASE WHEN ${rooms.status} = 'scheduled' THEN 1 ELSE 0 END) AS int)`,
      })
      .from(rooms)
      .innerJoin(roomCategories, eq(rooms.categoryId, roomCategories.id))
      .where(
        and(
          eq(rooms.roomType, "space"),
          inArray(rooms.status, ["live", "scheduled"]),
          eq(rooms.visibility, "public"),
          activeSpaceListingPredicate(),
        ),
      )
      .groupBy(roomCategories.id);
  },

  /**
   * All public live/scheduled circles in a category for Explore niche browse.
   * Includes circles the viewer hosts or already joined — counts use the same scope.
   */
  async listPublicSpacesInCategory(
    userId: string,
    categoryId: string,
    limit: number,
    cursor?: string,
  ) {
    const restrictedExists = db
      .select({ one: sql<number>`1` })
      .from(roomRestrictedUsers)
      .where(
        and(
          eq(roomRestrictedUsers.roomId, rooms.id),
          eq(roomRestrictedUsers.userId, userId),
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
      .select(activeSpaceColumns())
      .from(rooms)
      .innerJoin(roomCategories, eq(rooms.categoryId, roomCategories.id))
      .innerJoin(users, eq(rooms.hostUserId, users.id))
      .where(
        and(
          eq(rooms.roomType, "space"),
          inArray(rooms.status, ["live", "scheduled"]),
          eq(rooms.visibility, "public"),
          eq(rooms.categoryId, categoryId),
          notExists(restrictedExists),
          activeSpaceListingPredicate(),
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
