/**
 * One-off dev utility: delete a user and chat rows that block FK constraints.
 * Usage: bun scripts/delete-user-by-email.ts user@example.com
 */

import { eq, inArray, or } from "drizzle-orm";
import { db, pool } from "@/core/database";
import {
  users,
  rooms,
  conversations,
  conversationParticipants,
  messages,
  messageReactions,
  messageReadReceipts,
  pinnedMessages,
  userConnections,
} from "@/core/database/schema";

const email = process.argv[2];
if (!email) {
  console.error("Usage: bun scripts/delete-user-by-email.ts <email>");
  process.exit(1);
}

const user = await db.query.users.findFirst({
  where: eq(users.email, email),
  columns: { id: true, email: true, username: true, displayName: true },
});

if (!user) {
  console.log("User not found (already deleted?)");
  await pool.end();
  process.exit(0);
}

const userId = user.id;
console.log("Deleting user:", user);

const hostedRooms = await db
  .select({ id: rooms.id })
  .from(rooms)
  .where(eq(rooms.hostUserId, userId));
const hostedRoomIds = hostedRooms.map((r) => r.id);

const connections = await db
  .select({ id: userConnections.id })
  .from(userConnections)
  .where(or(eq(userConnections.requesterId, userId), eq(userConnections.addresseeId, userId)));
const connectionIds = connections.map((c) => c.id);

const participantRows = await db
  .select({ conversationId: conversationParticipants.conversationId })
  .from(conversationParticipants)
  .where(eq(conversationParticipants.userId, userId));

const roomConversations =
  hostedRoomIds.length > 0
    ? await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(inArray(conversations.roomId, hostedRoomIds))
    : [];

const connectionConversations =
  connectionIds.length > 0
    ? await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(inArray(conversations.connectionId, connectionIds))
    : [];

const conversationIds = [
  ...new Set([
    ...participantRows.map((r) => r.conversationId),
    ...roomConversations.map((r) => r.id),
    ...connectionConversations.map((r) => r.id),
  ]),
];

console.log("Cleanup:", {
  hostedRooms: hostedRoomIds.length,
  connections: connectionIds.length,
  conversations: conversationIds.length,
});

await db.delete(pinnedMessages).where(eq(pinnedMessages.pinnedBy, userId));
await db.delete(messageReactions).where(eq(messageReactions.userId, userId));
await db.delete(messageReadReceipts).where(eq(messageReadReceipts.userId, userId));
await db.delete(messages).where(eq(messages.senderId, userId));

if (conversationIds.length > 0) {
  await db.delete(pinnedMessages).where(inArray(pinnedMessages.conversationId, conversationIds));
  await db.delete(messages).where(inArray(messages.conversationId, conversationIds));
  await db
    .delete(conversationParticipants)
    .where(inArray(conversationParticipants.conversationId, conversationIds));
  await db.delete(conversations).where(inArray(conversations.id, conversationIds));
}

await db
  .delete(conversationParticipants)
  .where(eq(conversationParticipants.userId, userId));

await db
  .update(conversations)
  .set({ expandedByUserId: null })
  .where(eq(conversations.expandedByUserId, userId));

if (connectionIds.length > 0) {
  await db.delete(userConnections).where(inArray(userConnections.id, connectionIds));
}

const deleted = await db
  .delete(users)
  .where(eq(users.id, userId))
  .returning({ id: users.id, email: users.email, username: users.username });

console.log("Deleted:", deleted);

const remaining = await db.query.users.findFirst({
  where: eq(users.email, email),
  columns: { id: true },
});
console.log("Remaining row:", remaining ?? null);

await pool.end();
