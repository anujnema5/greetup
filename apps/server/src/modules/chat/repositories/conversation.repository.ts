import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
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
        columns: { id: true, username: true, name: true, displayName: true, image: true },
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
    return this.findOrCreatePeerConversation(userA, userB);
  },

  /** DM between two users — connection thread when accepted, otherwise room_direct. */
  async findOrCreatePeerConversation(userA: string, userB: string) {
    if (userA === userB) throw new Error('INVALID_PEER');

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

      if (conn) {
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
      }

      const existingPeerId = await findExistingPeerConversationId(tx, userA, userB);
      if (existingPeerId) {
        return tx.query.conversations.findFirst({
          where: eq(conversations.id, existingPeerId),
          with: conversationWithDisplay,
        });
      }

      const [conv] = await tx.insert(conversations).values({
        type:        'room_direct',
        roomId:      null,
        isPersisted: false,
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
        isNull(conversationParticipants.leftAt),
      ),
    });
    return !!row;
  },

  async hasParticipantRecord(conversationId: string, userId: string): Promise<boolean> {
    const row = await db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
      columns: { userId: true },
    });
    return !!row;
  },

  async getParticipant(conversationId: string, userId: string) {
    return db.query.conversationParticipants.findFirst({
      where: and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ),
    });
  },

  async markLeft(conversationId: string, userId: string): Promise<boolean> {
    const now = new Date();
    const result = await db
      .update(conversationParticipants)
      .set({ leftAt: now, historyHiddenBeforeAt: now })
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
        isNull(conversationParticipants.leftAt),
      ))
      .returning({ userId: conversationParticipants.userId });
    return result.length > 0;
  },

  async rejoin(conversationId: string, userId: string): Promise<void> {
    await db
      .update(conversationParticipants)
      .set({ leftAt: null })
      .where(and(
        eq(conversationParticipants.conversationId, conversationId),
        eq(conversationParticipants.userId, userId),
      ));
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

async function findExistingPeerConversationId(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userA: string,
  userB: string,
): Promise<string | null> {
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
        eq(conversations.type, 'room_direct'),
        eq(conversations.type, 'connection'),
      ),
    ),
    columns: { id: true },
    orderBy: asc(conversations.createdAt),
  });

  return existing?.id ?? null;
}
