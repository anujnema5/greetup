import { and, asc, eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  mergeRoomAdvancedOptions,
  roomCategories,
  roomFriendInvites,
  roomParticipants,
  rooms,
  type RoomAdvancedOptions,
} from "@/core/database/schema";

export const roomsRepository = {
  async findRoomById(roomId: string) {
    return db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });
  },

  async isUserRoomParticipant(roomId: string, userId: string) {
    const row = await db.query.roomParticipants.findFirst({
      where: and(eq(roomParticipants.roomId, roomId), eq(roomParticipants.userId, userId)),
      columns: { id: true },
    });
    return !!row;
  },

  /**
   * Marks a scheduled room as live and sets rtc_room_id to the same id for correlation with SFU/RTC.
   */
  async markRoomLive(roomId: string, startedAt: Date) {
    const [row] = await db
      .update(rooms)
      .set({
        status: "live",
        startedAt,
        rtcRoomId: roomId,
        updatedAt: new Date(),
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
    roomType: "direct" | "circle";
  }) {
    return db.transaction(async (tx) => {
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
};
