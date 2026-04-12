import { and, desc, eq, lt } from 'drizzle-orm';
import { db } from '@/core/database';
import {
  messages,
  messageReactions,
  messageReadReceipts,
  pinnedMessages,
} from '@/core/database/schema';
import { encryptMessage, decryptMessage } from '@/core/crypto/message-crypto';

export type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: string;
  replyToId: string | null;
  mentions: string[] | null;
  systemPayload: unknown;
  editedAt: Date | null;
  isDeleted: boolean;
  deletedForAll: boolean;
  createdAt: Date;
};

function toMessageRow(raw: typeof messages.$inferSelect): MessageRow {
  let content = '';

  if (raw.messageType === 'system') {
    content = '';
  } else if (!raw.isDeleted && !raw.deletedForAll && raw.encryptedContent && raw.iv) {
    try {
      content = decryptMessage(raw.encryptedContent, raw.iv);
    } catch {
      content = '[decryption error]';
    }
  }

  return {
    id:             raw.id,
    conversationId: raw.conversationId,
    senderId:       raw.senderId,
    content,
    messageType:    raw.messageType,
    replyToId:      raw.replyToId ?? null,
    mentions:       raw.mentions ?? null,
    systemPayload:  raw.systemPayload ?? null,
    editedAt:       raw.editedAt ?? null,
    isDeleted:      raw.isDeleted,
    deletedForAll:  raw.deletedForAll,
    createdAt:      raw.createdAt,
  };
}

export const messageRepository = {
  async insertMessage(params: {
    conversationId: string;
    senderId: string;
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
    replyToId?: string;
    mentions?: string[];
  }): Promise<MessageRow> {
    const { encryptedContent, iv } = encryptMessage(params.content);

    const [row] = await db.insert(messages).values({
      conversationId:  params.conversationId,
      senderId:        params.senderId,
      encryptedContent,
      iv,
      messageType:     params.messageType ?? 'text',
      replyToId:       params.replyToId,
      mentions:        params.mentions,
    }).returning();

    return toMessageRow(row);
  },

  async insertSystemMessage(params: {
    conversationId: string;
    senderId: string;
    systemPayload: Record<string, unknown>;
  }): Promise<MessageRow> {
    const [row] = await db.insert(messages).values({
      conversationId:   params.conversationId,
      senderId:         params.senderId,
      encryptedContent: '',
      iv:               '',
      messageType:      'system',
      systemPayload:    params.systemPayload,
    }).returning();

    return toMessageRow(row);
  },

  async getMessages(params: {
    conversationId: string;
    cursor?: string;
    limit: number;
  }): Promise<{ messages: MessageRow[]; nextCursor: string | null }> {
    const rows = await db.select().from(messages)
      .where(and(
        eq(messages.conversationId, params.conversationId),
        ...(params.cursor ? [lt(messages.createdAt, new Date(params.cursor))] : []),
      ))
      .orderBy(desc(messages.createdAt))
      .limit(params.limit + 1);
    const hasMore = rows.length > params.limit;
    const page = hasMore ? rows.slice(0, params.limit) : rows;

    return {
      messages:   page.map(toMessageRow).reverse(),
      nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
    };
  },

  async findById(id: string): Promise<MessageRow | null> {
    const row = await db.query.messages.findFirst({
      where: eq(messages.id, id),
    });
    return row ? toMessageRow(row) : null;
  },

  async editMessage(messageId: string, newContent: string): Promise<MessageRow | null> {
    const existing = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });
    if (!existing) return null;

    const oldContent = decryptMessage(existing.encryptedContent, existing.iv);
    const history = Array.isArray(existing.editHistory) ? existing.editHistory : [];
    history.push({ content: oldContent, editedAt: existing.editedAt ?? existing.createdAt });

    const { encryptedContent, iv } = encryptMessage(newContent);
    const [row] = await db.update(messages)
      .set({ encryptedContent, iv, editedAt: new Date(), editHistory: history })
      .where(eq(messages.id, messageId))
      .returning();

    return toMessageRow(row);
  },

  async softDeleteMessage(messageId: string, deleteForAll: boolean): Promise<void> {
    await db.update(messages)
      .set({
        isDeleted:     true,
        deletedForAll: deleteForAll,
        deletedAt:     new Date(),
        encryptedContent: '',
        iv:            '',
      })
      .where(eq(messages.id, messageId));
  },

  async addReaction(messageId: string, userId: string, emoji: string) {
    await db.insert(messageReactions)
      .values({ messageId, userId, emoji })
      .onConflictDoNothing();
    return this.getReactions(messageId);
  },

  async removeReaction(messageId: string, userId: string, emoji: string) {
    await db.delete(messageReactions)
      .where(and(
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji),
      ));
    return this.getReactions(messageId);
  },

  async getReactions(messageId: string) {
    return db.query.messageReactions.findMany({
      where: eq(messageReactions.messageId, messageId),
    });
  },

  async markRead(messageId: string, userId: string) {
    await db.insert(messageReadReceipts)
      .values({ messageId, userId })
      .onConflictDoNothing();
  },

  async pinMessage(conversationId: string, messageId: string, userId: string) {
    await db.insert(pinnedMessages)
      .values({ conversationId, messageId, pinnedBy: userId })
      .onConflictDoNothing();
  },

  async unpinMessage(conversationId: string, messageId: string) {
    await db.delete(pinnedMessages)
      .where(and(
        eq(pinnedMessages.conversationId, conversationId),
        eq(pinnedMessages.messageId, messageId),
      ));
  },
};
