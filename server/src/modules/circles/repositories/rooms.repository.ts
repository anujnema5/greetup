import { and, asc, eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  circleCategories,
  roomFriendInvites,
  roomParticipants,
  rooms,
  type RoomAdvancedOptions,
} from "@/core/database/schema";

export const roomsRepository = {
  async findActiveCategoryById(categoryId: string) {
    return db.query.circleCategories.findFirst({
      where: and(
        eq(circleCategories.id, categoryId),
        eq(circleCategories.isActive, true),
      ),
    });
  },

  async listActiveCategories() {
    return db.query.circleCategories.findMany({
      where: eq(circleCategories.isActive, true),
      orderBy: [asc(circleCategories.sortOrder), asc(circleCategories.displayName)],
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
