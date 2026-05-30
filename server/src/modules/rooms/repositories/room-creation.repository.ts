import { eq } from "drizzle-orm";

import { db } from "@/core/database";
import {
  mergeRoomAdvancedOptions,
  roomFriendInvites,
  roomParticipants,
  rooms,
  type RoomAdvancedOptions,
} from "@/core/database/schema";
import { computeRoomExpiryFields } from "@/modules/rooms/lib/expiry/room-expiry";
import type { RoomSessionType } from "@/shared/types/room-session";

export const roomCreationRepository = {
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

  /** Live 1:1 direct room for a connection call — host only until callee accepts. */
  async createConnectionCallRoom(params: {
    roomId: string;
    hostUserId: string;
    categoryId: string;
    title: string;
  }) {
    const now = new Date();
    const advancedOptions = mergeRoomAdvancedOptions(null);

    await db.transaction(async (tx) => {
      await tx.insert(rooms).values({
        id: params.roomId,
        categoryId: params.categoryId,
        hostUserId: params.hostUserId,
        title: params.title,
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

      await tx.insert(roomParticipants).values({
        roomId: params.roomId,
        userId: params.hostUserId,
        role: "host",
      });
    });

    return params.roomId;
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
};
