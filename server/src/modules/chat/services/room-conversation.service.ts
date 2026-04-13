import { and, eq, or } from "drizzle-orm";
import { db } from "@/core/database";
import {
  conversations,
  conversationParticipants,
} from "@/core/database/schema";
import { userConnections } from "@/core/database/schema/connections";
import { roomParticipants } from "@/core/database/schema/rooms";
import type { RoomSessionType } from "@/shared/types/room-session";

/**
 * Get or create the chat conversation for a room.
 *
 * Direct rooms (1:1):
 *   - If the two participants have an existing connection DM, link it to the room.
 *   - Otherwise create a new room_direct conversation (ephemeral by default).
 *
 * Circle rooms (group):
 *   - Always persisted. Create once, then reuse across joins.
 *   - All current room_participants are added as conversation participants.
 */
export async function getOrCreateRoomConversation(
  roomId: string,
  roomType: RoomSessionType,
  hostUserId: string,
): Promise<string> {
  // If a conversation already exists for this room, return it
  const existing = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.roomId, roomId),
    ),
    columns: { id: true },
  });

  if (existing) return existing.id;

  if (roomType === "direct") {
    return createDirectRoomConversation(roomId, hostUserId);
  }

  return createCircleRoomConversation(roomId);
}

async function createDirectRoomConversation(roomId: string, hostUserId: string): Promise<string> {
  // Find the other participant in this direct room
  const participants = await db.query.roomParticipants.findMany({
    where: and(eq(roomParticipants.roomId, roomId)),
    columns: { userId: true },
  });

  const otherUserId = participants.find((p) => p.userId !== hostUserId)?.userId;

  // Accepted connection: always use a single `connection` DM (create + link room if needed).
  // Serialized on the user_connections row so RTC + chat API cannot create duplicates in parallel.
  if (otherUserId) {
    const conn = await db.query.userConnections.findFirst({
      where: and(
        eq(userConnections.status, 'accepted'),
        or(
          and(eq(userConnections.requesterId, hostUserId), eq(userConnections.addresseeId, otherUserId)),
          and(eq(userConnections.requesterId, otherUserId), eq(userConnections.addresseeId, hostUserId)),
        ),
      ),
      columns: { id: true },
    });

    if (conn) {
      return db.transaction(async (tx) => {
        await tx
          .select({ id: userConnections.id })
          .from(userConnections)
          .where(eq(userConnections.id, conn.id))
          .for('update');

        const connConv = await tx.query.conversations.findFirst({
          where: and(
            eq(conversations.type, 'connection'),
            eq(conversations.connectionId, conn.id),
          ),
          columns: { id: true },
        });

        if (connConv) {
          await tx
            .update(conversations)
            .set({ roomId })
            .where(eq(conversations.id, connConv.id));
          return connConv.id;
        }

        const [created] = await tx.insert(conversations).values({
          type:         'connection',
          connectionId: conn.id,
          roomId,
          isPersisted:  true,
        }).returning({ id: conversations.id });

        const userIds = participants.map((p) => p.userId);
        if (userIds.length > 0) {
          await tx.insert(conversationParticipants).values(
            userIds.map((userId) => ({ conversationId: created.id, userId })),
          ).onConflictDoNothing({
            target: [conversationParticipants.conversationId, conversationParticipants.userId],
          });
        }

        return created.id;
      });
    }
  }

  // Fresh room_direct conversation (ephemeral — participants can opt in to persist)
  const [conv] = await db.insert(conversations).values({
    type:        'room_direct',
    roomId,
    isPersisted: false,
  }).returning({ id: conversations.id });

  const userIds = participants.map((p) => p.userId);
  if (userIds.length > 0) {
    await db.insert(conversationParticipants).values(
      userIds.map((userId) => ({ conversationId: conv.id, userId })),
    );
  }

  return conv.id;
}

async function createCircleRoomConversation(roomId: string): Promise<string> {
  const participants = await db.query.roomParticipants.findMany({
    where: eq(roomParticipants.roomId, roomId),
    columns: { userId: true },
  });

  const [conv] = await db.insert(conversations).values({
    type:        'room_circle',
    roomId,
    isPersisted: true,
  }).returning({ id: conversations.id });

  if (participants.length > 0) {
    await db.insert(conversationParticipants).values(
      participants.map((p) => ({ conversationId: conv.id, userId: p.userId })),
    );
  }

  return conv.id;
}

/**
 * Ensure a user is a conversation participant when they join a room mid-session.
 */
export async function ensureRoomConversationParticipant(
  roomId: string,
  userId: string,
): Promise<void> {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.roomId, roomId),
    columns: { id: true },
  });

  if (!conv) return;

  const existing = await db.query.conversationParticipants.findFirst({
    where: and(
      eq(conversationParticipants.conversationId, conv.id),
      eq(conversationParticipants.userId, userId),
    ),
    columns: { userId: true },
  });

  if (!existing) {
    await db.insert(conversationParticipants)
      .values({ conversationId: conv.id, userId })
      .onConflictDoNothing();
  }
}
