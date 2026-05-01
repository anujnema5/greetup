import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/core/database";
import {
  conversations,
  conversationParticipants,
  messages,
  roomFriendInvites,
  roomParticipants,
  rooms,
  users,
} from "@/core/database/schema";

const EXPANDED_MAX = 8;

/** Thrown when the optimistic `rooms.room_type = direct` update matches zero rows (already expanded / race). */
export class DirectRoomExpandConflictError extends Error {
  constructor() {
    super("This call was already expanded");
    this.name = "DirectRoomExpandConflictError";
  }
}

export const roomInviteRepository = {
  async findDisplayLabelForUser(userId: string): Promise<string> {
    const row = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { displayName: true, name: true },
    });
    const d = row?.displayName?.trim();
    if (d) return d;
    return row?.name?.trim() || "Member";
  },

  async findFriendInviteByRoomAndInvitee(roomId: string, inviteeUserId: string) {
    return db.query.roomFriendInvites.findFirst({
      where: and(
        eq(roomFriendInvites.roomId, roomId),
        eq(roomFriendInvites.inviteeUserId, inviteeUserId),
      ),
    });
  },

  async findFriendInviteById(inviteId: string) {
    return db.query.roomFriendInvites.findFirst({
      where: eq(roomFriendInvites.id, inviteId),
    });
  },

  async upsertPendingFriendInvite(params: {
    roomId: string;
    inviterUserId: string;
    inviteeUserId: string;
  }): Promise<string | null> {
    const now = new Date();
    const [inv] = await db
      .insert(roomFriendInvites)
      .values({
        roomId: params.roomId,
        inviterUserId: params.inviterUserId,
        inviteeUserId: params.inviteeUserId,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [roomFriendInvites.roomId, roomFriendInvites.inviteeUserId],
        set: {
          inviterUserId: params.inviterUserId,
          status: "pending",
          updatedAt: now,
        },
      })
      .returning({ id: roomFriendInvites.id });

    return inv?.id ?? null;
  },

  async setFriendInviteDeclined(inviteId: string): Promise<void> {
    await db
      .update(roomFriendInvites)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(roomFriendInvites.id, inviteId));
  },

  async setFriendInviteAccepted(inviteId: string): Promise<void> {
    await db
      .update(roomFriendInvites)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(roomFriendInvites.id, inviteId));
  },

  /**
   * Promotes a live direct room to circle, accepts the invite, adds participant + chat side-effects.
   * Rolls back on conflict (room no longer direct).
   */
  async runExpandDirectAcceptTransaction(params: {
    roomId: string;
    inviteId: string;
    inviteeUserId: string;
    inviterUserId: string;
    currentMaxParticipants: number;
  }): Promise<void> {
    const { roomId, inviteId, inviteeUserId, inviterUserId, currentMaxParticipants } = params;

    await db.transaction(async (tx) => {
      const [updatedRoom] = await tx
        .update(rooms)
        .set({
          roomType: "circle",
          maxParticipants: Math.max(currentMaxParticipants, EXPANDED_MAX),
          updatedAt: new Date(),
        })
        .where(and(eq(rooms.id, roomId), eq(rooms.roomType, "direct")))
        .returning({ id: rooms.id });

      if (!updatedRoom) {
        throw new DirectRoomExpandConflictError();
      }

      await tx
        .update(roomFriendInvites)
        .set({ status: "accepted", updatedAt: new Date() })
        .where(eq(roomFriendInvites.id, inviteId));

      const pNow = new Date();
      await tx
        .insert(roomParticipants)
        .values({
          roomId,
          userId: inviteeUserId,
          role: "participant",
          joinedAt: pNow,
        })
        .onConflictDoUpdate({
          target: [roomParticipants.roomId, roomParticipants.userId],
          set: { leftAt: null, joinedAt: pNow, updatedAt: pNow, role: "participant" },
        });

      const conv = await tx.query.conversations.findFirst({
        where: eq(conversations.roomId, roomId),
      });

      if (conv) {
        await tx
          .update(conversations)
          .set({
            type: "room_circle",
            connectionId: null,
            isPersisted: true,
            expandedAt: new Date(),
            expandedByUserId: inviterUserId,
            updatedAt: new Date(),
          })
          .where(eq(conversations.id, conv.id));

        await tx
          .insert(conversationParticipants)
          .values({ conversationId: conv.id, userId: inviteeUserId })
          .onConflictDoNothing();

        const [sysRow] = await tx
          .insert(messages)
          .values({
            conversationId: conv.id,
            senderId: inviterUserId,
            encryptedContent: "",
            iv: "",
            messageType: "system",
            systemPayload: { event: "user_added", userId: inviteeUserId },
          })
          .returning({ id: messages.id });

        if (sysRow) {
          await tx
            .update(conversationParticipants)
            .set({ joinedFromMessageId: sysRow.id })
            .where(
              and(
                eq(conversationParticipants.conversationId, conv.id),
                eq(conversationParticipants.userId, inviteeUserId),
              ),
            );
        }
      } else {
        const partRows = await tx.query.roomParticipants.findMany({
          where: and(eq(roomParticipants.roomId, roomId), isNull(roomParticipants.leftAt)),
          columns: { userId: true },
        });
        const participantIds = partRows.map((r) => r.userId);

        const [newConv] = await tx
          .insert(conversations)
          .values({
            type: "room_circle",
            roomId,
            isPersisted: true,
            expandedAt: new Date(),
            expandedByUserId: inviterUserId,
          })
          .returning({ id: conversations.id });

        if (newConv) {
          const rows = participantIds.map((userId) => ({ conversationId: newConv.id, userId }));
          if (rows.length > 0) {
            await tx.insert(conversationParticipants).values(rows).onConflictDoNothing();
          }
          await tx.insert(messages).values({
            conversationId: newConv.id,
            senderId: inviterUserId,
            encryptedContent: "",
            iv: "",
            messageType: "system",
            systemPayload: { event: "user_added", userId: inviteeUserId },
          });
        }
      }
    });
  },
};

/** Back-compat alias (legacy direct-expand naming). */
export const expandDirectRoomRepository = roomInviteRepository;
