import { getRedis } from '@/core/redis';
import { CHAT_KEYS, CHAT_RATE_LIMIT, CHAT_RATE_WINDOW } from '@/core/redis/keys';
import { conversationRepository } from '../repositories/conversation.repository';
import { messageRepository } from '../repositories/message.repository';

export const messageService = {
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
    await conversationRepository.isParticipant(params.conversationId, params.senderId);

    const msg = await messageRepository.insertMessage(params);

    // Update unread counts for all OTHER participants
    const conv = await conversationRepository.findById(params.conversationId);
    if (conv) {
      const redis = getRedis();
      for (const p of conv.participants) {
        if (p.userId !== params.senderId) {
          await redis.hincrby(CHAT_KEYS.unreadCounts(p.userId), params.conversationId, 1);
        }
      }
    }

    return msg;
  },

  async getMessages(params: {
    conversationId: string;
    userId: string;
    cursor?: string;
    limit: number;
  }) {
    const isMember = await conversationRepository.isParticipant(params.conversationId, params.userId);
    if (!isMember) throw new Error('UNAUTHORIZED');

    return messageRepository.getMessages({
      conversationId: params.conversationId,
      cursor: params.cursor,
      limit: params.limit,
    });
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
    return messageRepository.editMessage(params.messageId, params.content);
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
    return messageRepository.removeReaction(params.messageId, params.userId, params.emoji);
  },

  async setTyping(conversationId: string, userId: string, isTyping: boolean) {
    const redis = getRedis();
    const key = CHAT_KEYS.typingMember(conversationId, userId);
    if (isTyping) {
      await redis.set(key, '1', 'EX', 3);
    } else {
      await redis.del(key);
    }
  },
};
