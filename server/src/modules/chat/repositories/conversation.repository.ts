import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/core/database';
import {
  conversations,
  conversationParticipants,
} from '@/core/database/schema';
import { userConnections } from '@/core/database/schema/connections';

/** Nested load for API responses: participant users + room title for circles. */
const conversationWithDisplay = {
  participants: {
    with: {
      user: {
        columns: { id: true, name: true, displayName: true, image: true },
      },
    },
  },
  room: { columns: { id: true, title: true } },
} as const;

export const conversationRepository = {
  async findById(id: string) {
    return db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: conversationWithDisplay,
    });
  },

  async findConnectionConversation(userA: string, userB: string) {
    // Find the accepted connection row
    const conn = await db.query.userConnections.findFirst({
      where: and(
        eq(userConnections.status, 'accepted'),
        or(
          and(eq(userConnections.requesterId, userA), eq(userConnections.addresseeId, userB)),
          and(eq(userConnections.requesterId, userB), eq(userConnections.addresseeId, userA)),
        ),
      ),
    });

    if (!conn) return null;

    return db.query.conversations.findFirst({
      where: and(
        eq(conversations.type, 'connection'),
        eq(conversations.connectionId, conn.id),
      ),
      with: conversationWithDisplay,
    });
  },

  async findOrCreateConnectionConversation(userA: string, userB: string) {
    return db.transaction(async (tx) => {
      const conn = await tx.query.userConnections.findFirst({
        where: and(
          eq(userConnections.status, 'accepted'),
          or(
            and(eq(userConnections.requesterId, userA), eq(userConnections.addresseeId, userB)),
            and(eq(userConnections.requesterId, userB), eq(userConnections.addresseeId, userA)),
          ),
        ),
      });

      if (!conn) throw new Error('NOT_CONNECTIONS');

      await tx
        .select({ id: userConnections.id })
        .from(userConnections)
        .where(eq(userConnections.id, conn.id))
        .for('update');

      const existing = await tx.query.conversations.findFirst({
        where: and(
          eq(conversations.type, 'connection'),
          eq(conversations.connectionId, conn.id),
        ),
        with: conversationWithDisplay,
      });

      if (existing) return existing;

      const [conv] = await tx.insert(conversations).values({
        type:         'connection',
        connectionId: conn.id,
        isPersisted:  true,
      }).returning();

      await tx.insert(conversationParticipants).values([
        { conversationId: conv.id, userId: userA },
        { conversationId: conv.id, userId: userB },
      ]).onConflictDoNothing({
        target: [conversationParticipants.conversationId, conversationParticipants.userId],
      });

      return tx.query.conversations.findFirst({
        where: eq(conversations.id, conv.id),
        with: conversationWithDisplay,
      });
    });
  },

  async listForUser(userId: string) {
    // Find all conversations this user is still an active member of
    const participantRows = await db.query.conversationParticipants.findMany({
      where: and(
        eq(conversationParticipants.userId, userId),
        isNull(conversationParticipants.leftAt),
      ),
      with: {
        conversation: {
          with: conversationWithDisplay,
        },
      },
    });

    return participantRows.map((p) => p.conversation);
  },

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    const row = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    });
    return !!row;
  },

  async setPersistence(conversationId: string, userId: string, wantsPersistence: boolean) {
    await db.update(conversationParticipants)
      .set({ wantsPersistence })
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ));

    // If both participants want persistence, mark isPersisted = true on the conversation
    const participants = await db.query.conversationParticipants.findMany({
      where: eq(conversationParticipants.conversationId, conversationId),
    });

    const allWant = participants.every((p) => p.wantsPersistence);
    await db.update(conversations)
      .set({ isPersisted: allWant })
      .where(eq(conversations.id, conversationId));
  },

  async updateLastRead(conversationId: string, userId: string, messageId: string) {
    await db.update(conversationParticipants)
      .set({ lastReadMessageId: messageId, lastReadAt: new Date() })
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ));
  },

  async linkRoomToConversation(conversationId: string, roomId: string) {
    await db.update(conversations)
      .set({ roomId })
      .where(eq(conversations.id, conversationId));
  },
};
