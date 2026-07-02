import { and, eq, isNull, notInArray, sql } from "drizzle-orm";

import { db } from "@/core/database";
import {
  mergeRoomAdvancedOptions,
  roomFriendInvites,
  roomParticipants,
  rooms,
  type RoomAdvancedOptions,
} from "@/core/database/schema";
import { computeRoomExpiryFields } from "@/modules/rooms/lib/expiry/room-expiry";

export const roomScheduledSpacesRepository = {
  /**
   * Host-only: update a scheduled circle. Recomputes expiry; optionally replaces pending invites.
   */
  async updateScheduledSpaceByHost(params: {
    roomId: string;
    hostUserId: string;
    title?: string;
    categoryId?: string;
    description?: string | null;
    visibility?: "public" | "private";
    maxParticipants?: number;
    scheduledStartAt?: Date;
    scheduledEndAt?: Date | null;
    advancedOptionsPatch?: Partial<RoomAdvancedOptions> | null;
    inviteCode?: string | null;
    /** When set (including `[]`), pending invites are synced to this list; accepted rows are kept. */
    invitedUserIds?: string[];
  }): Promise<
    | { ok: true; id: string; title: string; scheduledStartAt: Date | null }
    | {
        ok: false;
        reason: "NOT_FOUND" | "INVALID_SCHEDULE" | "INVALID_END" | "ROOM_FULL";
      }
  > {
    return db.transaction(async (tx) => {
      const room = await tx.query.rooms.findFirst({
        where: and(eq(rooms.id, params.roomId), eq(rooms.hostUserId, params.hostUserId)),
        columns: {
          status: true,
          roomType: true,
          title: true,
          categoryId: true,
          description: true,
          visibility: true,
          maxParticipants: true,
          inviteCode: true,
          scheduledStartAt: true,
          scheduledEndAt: true,
          advancedOptions: true,
        },
      });

      if (!room || room.roomType !== "space" || room.status !== "scheduled") {
        return { ok: false, reason: "NOT_FOUND" } as const;
      }

      if (params.maxParticipants !== undefined) {
        const [cnt] = await tx
          .select({ n: sql<number>`cast(count(*) as int)` })
          .from(roomParticipants)
          .where(
            and(eq(roomParticipants.roomId, params.roomId), isNull(roomParticipants.leftAt)),
          );
        const activeSeats = cnt?.n ?? 0;
        if (activeSeats > params.maxParticipants) {
          return { ok: false, reason: "ROOM_FULL" } as const;
        }
      }

      const nextTitle =
        params.title !== undefined ? params.title.trim() : room.title;
      const nextCategoryId = params.categoryId ?? room.categoryId;
      const nextDescription =
        params.description !== undefined ? params.description : room.description;
      const nextVisibility = params.visibility ?? room.visibility;
      const nextMaxParticipants = params.maxParticipants ?? room.maxParticipants;
      const nextInviteCode =
        params.inviteCode !== undefined ? params.inviteCode : room.inviteCode;
      const nextStart =
        params.scheduledStartAt !== undefined
          ? params.scheduledStartAt
          : room.scheduledStartAt;
      const nextEnd =
        params.scheduledEndAt !== undefined ? params.scheduledEndAt : room.scheduledEndAt;

      const now = new Date();
      if (!nextStart || nextStart <= now) {
        return { ok: false, reason: "INVALID_SCHEDULE" } as const;
      }
      if (nextEnd && nextEnd <= nextStart) {
        return { ok: false, reason: "INVALID_END" } as const;
      }

      const nextAdvanced =
        params.advancedOptionsPatch != null &&
        Object.keys(params.advancedOptionsPatch).length > 0
          ? mergeRoomAdvancedOptions({
              ...(room.advancedOptions ?? {}),
              ...params.advancedOptionsPatch,
            } as RoomAdvancedOptions)
          : room.advancedOptions;

      const { expiresAt, isExpired } = computeRoomExpiryFields({
        status: "scheduled",
        scheduledStartAt: nextStart,
        scheduledEndAt: nextEnd,
        advancedOptions: nextAdvanced,
      });

      const [row] = await tx
        .update(rooms)
        .set({
          title: nextTitle,
          categoryId: nextCategoryId,
          description: nextDescription,
          visibility: nextVisibility,
          maxParticipants: nextMaxParticipants,
          inviteCode: nextInviteCode,
          scheduledStartAt: nextStart,
          scheduledEndAt: nextEnd,
          advancedOptions: nextAdvanced,
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
        return { ok: false, reason: "NOT_FOUND" } as const;
      }

      if (params.invitedUserIds !== undefined) {
        const ids = params.invitedUserIds;
        if (ids.length > 0) {
          await tx
            .delete(roomFriendInvites)
            .where(
              and(
                eq(roomFriendInvites.roomId, params.roomId),
                eq(roomFriendInvites.status, "pending"),
                notInArray(roomFriendInvites.inviteeUserId, ids),
              ),
            );
          await tx
            .insert(roomFriendInvites)
            .values(
              ids.map((inviteeUserId) => ({
                roomId: params.roomId,
                inviterUserId: params.hostUserId,
                inviteeUserId,
                status: "pending" as const,
              })),
            )
            .onConflictDoNothing({
              target: [roomFriendInvites.roomId, roomFriendInvites.inviteeUserId],
            });
        } else {
          await tx
            .delete(roomFriendInvites)
            .where(
              and(
                eq(roomFriendInvites.roomId, params.roomId),
                eq(roomFriendInvites.status, "pending"),
              ),
            );
        }
      }

      return { ok: true, ...row };
    });
  },

  /** Host cancels a scheduled circle before it goes live. */
  async cancelScheduledSpaceByHost(roomId: string, hostUserId: string) {
    const [row] = await db
      .update(rooms)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(rooms.id, roomId),
          eq(rooms.hostUserId, hostUserId),
          eq(rooms.roomType, "space"),
          eq(rooms.status, "scheduled"),
        ),
      )
      .returning({ id: rooms.id });
    return row ?? null;
  },
};
