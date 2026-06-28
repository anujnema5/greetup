import { inArray } from 'drizzle-orm';
import { db } from '@/core/database';
import { users } from '@/core/database/schema';
import logger from '@/core/logging';
import { getRedis } from '@/core/redis';
import { CHAT_KEYS, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW } from '@/core/redis/keys';
import { getChatNamespace } from '@/core/socket/socket';
import {
  connectionCallInboxPreview,
  isConnectionCallSystemPayload,
} from '@/modules/connections/lib/connection-call-system-payload';
import type { MessageRow } from '../repositories/message.repository';
import { assertCanMessageInConversation } from '../lib/conversation-messaging-guard';
import { conversationRepository } from '../repositories/conversation.repository';
import { messageRepository } from '../repositories/message.repository';

function systemPayloadPreview(payload: unknown): string | null {
  if (payload == null) return null;
  if (typeof payload === 'string') {
    const t = payload.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof payload === 'object' && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    if (typeof o.text === 'string' && o.text.trim()) return o.text.trim();
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (typeof o.body === 'string' && o.body.trim()) return o.body.trim();
    if (o.event === 'user_added') return 'Someone joined the space';
    if (isConnectionCallSystemPayload(o)) return connectionCallInboxPreview(o);
  }
  return 'System message';
}

export function inboxPreviewFromMessageRow(
  row: Pick<MessageRow, 'content' | 'messageType' | 'isDeleted' | 'deletedForAll' | 'systemPayload'>,
): string | null {
  if (row.isDeleted || row.deletedForAll) return null;
  switch (row.messageType) {
    case 'text': {
      const t = row.content.trim();
      return t.length > 0 ? t : null;
    }
    case 'image':
      return 'Photo';
    case 'video':
      return 'Video';
    case 'file':
      return 'File';
    case 'voice':
      return 'Voice message';
    case 'gif':
      return 'GIF';
    case 'system':
      return systemPayloadPreview(row.systemPayload);
    default:
      return null;
  }
}

export type MessageSenderPreview = {
  id: string;
  name: string;
  displayName: string | null;
  image: string | null;
};

function unknownSender(id: string): MessageSenderPreview {
  return { id, name: 'Unknown', displayName: null, image: null };
}

async function senderMapForIds(ids: string[]): Promise<Map<string, MessageSenderPreview>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db.query.users.findMany({
    where: inArray(users.id, unique),
    columns: { id: true, name: true, displayName: true, image: true },
  });
  return new Map(rows.map((u) => [u.id, u]));
}

async function withSenders(messagesList: MessageRow[]) {
  const map = await senderMapForIds(messagesList.map((m) => m.senderId));
  return messagesList.map((m) => ({
    ...m,
    sender: map.get(m.senderId) ?? unknownSender(m.senderId),
  }));
}

export const messageService = {
  async inboxPreviewsForConversationIds(
    conversationIds: string[],
  ): Promise<Map<string, string | null>> {
    const unique = [...new Set(conversationIds)].filter(Boolean);
    const latest = await messageRepository.findLatestByConversationIds(unique);
    const map = new Map<string, string | null>();
    for (const id of unique) {
      const row = latest.get(id);
      map.set(id, row ? inboxPreviewFromMessageRow(row) : null);
    }
    return map;
  },

  async inboxPreviewForConversation(conversationId: string): Promise<string | null> {
    const m = await this.inboxPreviewsForConversationIds([conversationId]);
    return m.get(conversationId) ?? null;
  },

  async checkRateLimit(userId: string): Promise<boolean> {
    const redis = getRedis();
    const key = CHAT_KEYS.messageRate(userId);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, CHAT_RATE_WINDOW);
    }
    return count <= CHAT_RATE_LIMIT;
  },

  async send(params: {
    conversationId: string;
    senderId: string;
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
    replyToId?: string;
    mentions?: string[];
  }) {
    const canAccess = await conversationRepository.hasParticipantRecord(
      params.conversationId,
      params.senderId,
    );
    if (!canAccess) throw new Error('UNAUTHORIZED');
    await conversationRepository.rejoin(params.conversationId, params.senderId);
    await assertCanMessageInConversation(params.conversationId, params.senderId);

    const msg = await messageRepository.insertMessage(params);

    // Update unread counts for all OTHER participants
    const conv = await conversationRepository.findById(params.conversationId);
    if (conv) {
      const redis = getRedis();
      for (const p of conv.participants) {
        if (p.userId !== params.senderId) {
          await conversationRepository.rejoin(params.conversationId, p.userId);
          await redis.hincrby(CHAT_KEYS.unreadCounts(p.userId), params.conversationId, 1);
        }
      }
    }

    const messageType = params.messageType ?? 'text';
    if (messageType === 'text') {
      logger.debug('message_sent', {
        conversationId: params.conversationId,
        messageId: msg.id,
        messageType,
      });
    }

    const [withSender] = await withSenders([msg]);
    return { ...withSender, reactions: [] as { id: string; messageId: string; userId: string; emoji: string; createdAt: string }[] };
  },

  async publishSystemMessage(params: {
    conversationId: string;
    senderId: string;
    systemPayload: Record<string, unknown>;
  }) {
    const isMember = await conversationRepository.isParticipant(params.conversationId, params.senderId);
    if (!isMember) throw new Error('UNAUTHORIZED');

    const msg = await messageRepository.insertSystemMessage(params);
    const conv = await conversationRepository.findById(params.conversationId);
    const redis = getRedis();

    if (conv) {
      for (const p of conv.participants) {
        if (p.userId !== params.senderId) {
          await conversationRepository.rejoin(params.conversationId, p.userId);
          await redis.hincrby(CHAT_KEYS.unreadCounts(p.userId), params.conversationId, 1);
        }
      }
    }

    const [withSender] = await withSenders([msg]);
    const full = {
      ...withSender,
      createdAt: withSender.createdAt.toISOString(),
      reactions: [] as { id: string; messageId: string; userId: string; emoji: string; createdAt: string }[],
    };

    try {
      const io = getChatNamespace();
      if (conv) {
        const lastActivityAt = full.createdAt;
        const lastMessagePreview = inboxPreviewFromMessageRow(msg);

        for (const p of conv.participants) {
          io.to(`user:${p.userId}`).emit('chat:message:new', full);
          io.to(`user:${p.userId}`).emit('chat:conversation:activity', {
            conversationId: params.conversationId,
            lastActivityAt,
            lastMessagePreview,
          });

          if (p.userId === params.senderId) continue;
          const raw = await redis.hget(CHAT_KEYS.unreadCounts(p.userId), params.conversationId);
          const unreadCount = Number.parseInt(raw ?? '0', 10) || 0;
          io.to(`user:${p.userId}`).emit('chat:unread:sync', {
            conversationId: params.conversationId,
            unreadCount,
          });
        }
      }
    } catch (error) {
      logger.warn("chat_system_message_socket_emit_failed", {
        error,
        conversationId: params.conversationId,
        messageId: full.id,
        event: params.systemPayload.event,
      });
    }

    logger.info("chat_system_message_published", {
      messageId: full.id,
      conversationId: params.conversationId,
      senderId: params.senderId,
      event: params.systemPayload.event ?? null,
      participantCount: conv?.participants.length ?? 0,
    });

    return full;
  },

  async getMessages(params: {
    conversationId: string;
    userId: string;
    cursor?: string;
    limit: number;
  }) {
    const isMember = await conversationRepository.isParticipant(params.conversationId, params.userId);
    if (!isMember) throw new Error('UNAUTHORIZED');

    const participant = await conversationRepository.getParticipant(
      params.conversationId,
      params.userId,
    );
    const hiddenBeforeAt = participant?.historyHiddenBeforeAt ?? undefined;

    const page = await messageRepository.getMessages({
      conversationId: params.conversationId,
      cursor: params.cursor,
      limit: params.limit,
      hiddenBeforeAt,
    });
    const reactionMap = await messageRepository.getReactionsForMessageIds(
      page.messages.map((m) => m.id),
    );
    const withSender = await withSenders(page.messages);
    return {
      nextCursor: page.nextCursor,
      messages:   withSender.map((m) => ({
        ...m,
        reactions: (reactionMap.get(m.id) ?? []).map((r) => ({
          id:        r.id,
          messageId: r.messageId,
          userId:    r.userId,
          emoji:     r.emoji,
          createdAt: r.createdAt.toISOString(),
        })),
      })),
    };
  },

  async markRead(params: { conversationId: string; messageId: string; userId: string }) {
    await messageRepository.markRead(params.messageId, params.userId);
    await conversationRepository.updateLastRead(params.conversationId, params.userId, params.messageId);

    // Reset unread count
    const redis = getRedis();
    await redis.hset(CHAT_KEYS.unreadCounts(params.userId), params.conversationId, '0');
  },

  async editMessage(params: { messageId: string; senderId: string; content: string }) {
    const existing = await messageRepository.findById(params.messageId);
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.senderId !== params.senderId) throw new Error('UNAUTHORIZED');
    await assertCanMessageInConversation(existing.conversationId, params.senderId);
    const updated = await messageRepository.editMessage(params.messageId, params.content);
    if (!updated) return null;
    const [out] = await withSenders([updated]);
    const reactionRows = await messageRepository.getReactions(params.messageId);
    return {
      ...out,
      reactions: reactionRows.map((r) => ({
        id:        r.id,
        messageId: r.messageId,
        userId:    r.userId,
        emoji:     r.emoji,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  },

  async deleteMessage(params: {
    messageId: string;
    senderId: string;
    deleteForAll: boolean;
  }) {
    const existing = await messageRepository.findById(params.messageId);
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.senderId !== params.senderId) throw new Error('UNAUTHORIZED');
    await messageRepository.softDeleteMessage(params.messageId, params.deleteForAll);
  },

  async addReaction(params: {
    messageId: string;
    conversationId: string;
    userId: string;
    emoji: string;
  }) {
    const isMember = await conversationRepository.isParticipant(params.conversationId, params.userId);
    if (!isMember) throw new Error('UNAUTHORIZED');
    await assertCanMessageInConversation(params.conversationId, params.userId);
    return messageRepository.addReaction(params.messageId, params.userId, params.emoji);
  },

  async removeReaction(params: {
    messageId: string;
    conversationId: string;
    userId: string;
    emoji: string;
  }) {
    const isMember = await conversationRepository.isParticipant(params.conversationId, params.userId);
    if (!isMember) throw new Error('UNAUTHORIZED');
    await assertCanMessageInConversation(params.conversationId, params.userId);
    return messageRepository.removeReaction(params.messageId, params.userId, params.emoji);
  },

  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    await assertCanMessageInConversation(conversationId, userId);
    const redis = getRedis();
    const key = CHAT_KEYS.typingMember(conversationId, userId);
    if (isTyping) {
      await redis.set(key, '1', 'EX', 3);
    } else {
      await redis.del(key);
    }
  },
};
