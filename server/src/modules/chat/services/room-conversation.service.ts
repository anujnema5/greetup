import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/core/database";
import {
  conversations,
  conversationParticipants,
} from "@/core/database/schema";
import { userConnections } from "@/core/database/schema/connections";
import { roomParticipants, rooms } from "@/core/database/schema/rooms";
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
  return db.transaction(async (tx) => {
    // Serialize conversation creation per room to avoid duplicate rows when
    // both peers open the room at the same time.
    await tx
      .select({ id: rooms.id })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .for("update");

    const existing = await tx.query.conversations.findFirst({
      where: eq(conversations.roomId, roomId),
      columns: { id: true },
    });

    if (existing) return existing.id;

    if (roomType === "direct") {
      return createDirectRoomConversation(tx, roomId, hostUserId);
    }

    return createCircleRoomConversation(tx, roomId);
  });
}

type DbLike = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertConversationParticipants(
  tx: DbLike,
  conversationId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;
  await tx.insert(conversationParticipants).values(
    userIds.map((userId) => ({ conversationId, userId })),
  ).onConflictDoNothing({
    target: [conversationParticipants.conversationId, conversationParticipants.userId],
  });
}

async function createDirectRoomConversation(tx: DbLike, roomId: string, hostUserId: string): Promise<string> {
  // Find the other participant in this direct room
  const participants = await tx.query.roomParticipants.findMany({
    where: and(eq(roomParticipants.roomId, roomId)),
    columns: { userId: true },
  });

  const otherUserId = participants.find((p) => p.userId !== hostUserId)?.userId;

  // Accepted connection: always use a single `connection` DM (create + link room if needed).
  // Serialized on the user_connections row so RTC + chat API cannot create duplicates in parallel.
  if (otherUserId) {
    const conn = await tx.query.userConnections.findFirst({
      where: and(
        eq(userConnections.status, "accepted"),
        or(
          and(eq(userConnections.requesterId, hostUserId), eq(userConnections.addresseeId, otherUserId)),
          and(eq(userConnections.requesterId, otherUserId), eq(userConnections.addresseeId, hostUserId)),
        ),
      ),
      columns: { id: true },
    });

    if (conn) {
      await tx
        .select({ id: userConnections.id })
        .from(userConnections)
        .where(eq(userConnections.id, conn.id))
        .for("update");

      const connConv = await tx.query.conversations.findFirst({
        where: and(
          eq(conversations.type, "connection"),
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

      // If a room_direct conversation already exists for this exact peer pair,
      // promote it to the canonical connection conversation instead of creating
      // another DM thread.
      const existingPeerDmId = await findExistingPeerConversationId(tx, hostUserId, otherUserId);
      if (existingPeerDmId) {
        await tx
          .update(conversations)
          .set({
            type: "connection",
            connectionId: conn.id,
            isPersisted: true,
            roomId,
          })
          .where(eq(conversations.id, existingPeerDmId));

        return existingPeerDmId;
      }

      const [created] = await tx.insert(conversations).values({
        type: "connection",
        connectionId: conn.id,
        roomId,
        isPersisted: true,
      }).returning({ id: conversations.id });

      await insertConversationParticipants(tx, created.id, participants.map((p) => p.userId));

      return created.id;
    }
  }

  if (otherUserId) {
    const existingPeerDmId = await findExistingPeerConversationId(tx, hostUserId, otherUserId);
    if (existingPeerDmId) {
      await tx
        .update(conversations)
        .set({ roomId })
        .where(eq(conversations.id, existingPeerDmId));

      return existingPeerDmId;
    }
  }

  // Fresh room_direct conversation (ephemeral — participants can opt in to persist)
  const [conv] = await tx.insert(conversations).values({
    type: "room_direct",
    roomId,
    isPersisted: false,
  }).returning({ id: conversations.id });

  await insertConversationParticipants(tx, conv.id, participants.map((p) => p.userId));

  return conv.id;
}

async function findExistingPeerConversationId(tx: DbLike, userA: string, userB: string): Promise<string | null> {
  const userARows = await tx.query.conversationParticipants.findMany({
    where: eq(conversationParticipants.userId, userA),
    columns: { conversationId: true },
  });
  const userAConversationIds = userARows.map((row) => row.conversationId);
  if (userAConversationIds.length === 0) return null;

  const sharedRows = await tx.query.conversationParticipants.findMany({
    where: and(
      eq(conversationParticipants.userId, userB),
      inArray(conversationParticipants.conversationId, userAConversationIds),
    ),
    columns: { conversationId: true },
  });
  const sharedConversationIds = sharedRows.map((row) => row.conversationId);
  if (sharedConversationIds.length === 0) return null;

  const existing = await tx.query.conversations.findFirst({
    where: and(
      inArray(conversations.id, sharedConversationIds),
      or(
        eq(conversations.type, "room_direct"),
        eq(conversations.type, "connection"),
      ),
    ),
    columns: { id: true },
    orderBy: asc(conversations.createdAt),
  });

  return existing?.id ?? null;
}

async function createCircleRoomConversation(tx: DbLike, roomId: string): Promise<string> {
  const participants = await tx.query.roomParticipants.findMany({
    where: eq(roomParticipants.roomId, roomId),
    columns: { userId: true },
  });

  const [conv] = await tx.insert(conversations).values({
    type: "room_circle",
    roomId,
    isPersisted: true,
  }).returning({ id: conversations.id });

  await insertConversationParticipants(tx, conv.id, participants.map((p) => p.userId));

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
