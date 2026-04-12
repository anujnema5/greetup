import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/core/database';
import {
  conversations,
  conversationParticipants,
  messages,
} from '@/core/database/schema';
import { userConnections } from '@/core/database/schema/connections';

export const conversationRepository = {
  async findById(id: string) {
    return db.query.conversations.findFirst({
      where: eq(conversations.id, id),
      with: { participants: true },
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
      with: { participants: true },
    });
  },

  async findOrCreateConnectionConversation(userA: string, userB: string) {
    const existing = await this.findConnectionConversation(userA, userB);
    if (existing) return existing;

    const conn = await db.query.userConnections.findFirst({
      where: and(
        eq(userConnections.status, 'accepted'),
        or(
          and(eq(userConnections.requesterId, userA), eq(userConnections.addresseeId, userB)),
          and(eq(userConnections.requesterId, userB), eq(userConnections.addresseeId, userA)),
        ),
      ),
    });

    if (!conn) throw new Error('NOT_CONNECTIONS');

    const [conv] = await db.insert(conversations).values({
      type:         'connection',
      connectionId: conn.id,
      isPersisted:  true,
    }).returning();

    await db.insert(conversationParticipants).values([
      { conversationId: conv.id, userId: userA },
      { conversationId: conv.id, userId: userB },
    ]);

    return db.query.conversations.findFirst({
      where: eq(conversations.id, conv.id),
      with: { participants: true },
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
          with: { participants: true },
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
