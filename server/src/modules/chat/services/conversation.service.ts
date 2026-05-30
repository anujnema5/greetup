import { desc, inArray, max } from 'drizzle-orm';
import { db } from '@/core/database';
import { messages } from '@/core/database/schema';
import logger from '@/core/logging';
import { getRedis } from '@/core/redis';
import { CHAT_KEYS } from '@/core/redis/keys';
import { assertMessagingAllowed } from '@/modules/blocks/lib/messaging-block-status';
import {
  attachMessagingBlock,
  getMessagingBlockForConversation,
} from '../lib/conversation-messaging-guard';
import { conversationRepository } from '../repositories/conversation.repository';
import { messageService } from './message.service';

export const conversationService = {
  async listForUser(userId: string) {
    const convs = await conversationRepository.listForUser(userId);
    const filtered = convs.filter(Boolean);
    const ids = filtered.map((c) => c.id);
    if (ids.length === 0) return [];

    const activityRows = await db
      .select({
        conversationId: messages.conversationId,
        lastMessageAt: max(messages.createdAt),
      })
      .from(messages)
      .where(inArray(messages.conversationId, ids))
      .groupBy(messages.conversationId)
      .orderBy(desc(max(messages.createdAt)), desc(messages.conversationId));

    const convById = new Map(filtered.map((c) => [c.id, c]));
    const ordered = activityRows
      .map((r) => convById.get(r.conversationId))
      .filter((c): c is NonNullable<typeof c> => c != null);

    const redis = getRedis();
    const unreadHash = await redis.hgetall(CHAT_KEYS.unreadCounts(userId));
    const previewMap = await messageService.inboxPreviewsForConversationIds(ids);

    const enriched = await Promise.all(
      ordered.map(async (c) => {
        const messagingBlock = await getMessagingBlockForConversation(c, userId);
        return attachMessagingBlock(c, messagingBlock);
      }),
    );

    return enriched.map((c) => ({
      ...c,
      unreadCount:         Number.parseInt(unreadHash[c.id] ?? '0', 10) || 0,
      lastMessagePreview:  previewMap.get(c.id) ?? null,
    }));
  },

  async getById(conversationId: string, userId: string) {
    const conv = await conversationRepository.findById(conversationId);
    if (!conv) return null;

    const isMember = await conversationRepository.isParticipant(conversationId, userId);
    if (!isMember) {
      logger.warn('conversation_access_unauthorized', { conversationId, userId });
      throw new Error('UNAUTHORIZED');
    }

    const messagingBlock = await getMessagingBlockForConversation(conv, userId);
    return attachMessagingBlock(conv, messagingBlock);
  },

  async getOrCreateConnectionConversation(userA: string, userB: string) {
    await assertMessagingAllowed(userA, userB);
    const conv = await conversationRepository.findOrCreateConnectionConversation(userA, userB);
    if (!conv) throw new Error('NOT_CONNECTIONS');
    await conversationRepository.rejoin(conv.id, userA);
    const refreshed = await conversationRepository.findById(conv.id);
    if (!refreshed) throw new Error('NOT_FOUND');
    return refreshed;
  },

  async leaveConversation(conversationId: string, userId: string) {
    const isMember = await conversationRepository.isParticipant(conversationId, userId);
    if (!isMember) {
      logger.warn('conversation_leave_unauthorized', { conversationId, userId });
      throw new Error('UNAUTHORIZED');
    }

    const removed = await conversationRepository.markLeft(conversationId, userId);
    if (!removed) {
      throw new Error('NOT_FOUND');
    }

    const redis = getRedis();
    await redis.hdel(CHAT_KEYS.unreadCounts(userId), conversationId);

    logger.info('conversation_left', { conversationId, userId });
  },

  async setPersistence(conversationId: string, userId: string, wantsPersistence: boolean) {
    const isMember = await conversationRepository.isParticipant(conversationId, userId);
    if (!isMember) {
      logger.warn('conversation_persistence_unauthorized', { conversationId, userId });
      throw new Error('UNAUTHORIZED');
    }
    await conversationRepository.setPersistence(conversationId, userId, wantsPersistence);
    logger.info('conversation_persistence_updated', { conversationId, userId, wantsPersistence });
  },

  async assertParticipant(conversationId: string, userId: string): Promise<void> {
    const isMember = await conversationRepository.isParticipant(conversationId, userId);
    if (!isMember) {
      logger.warn('conversation_assert_participant_unauthorized', { conversationId, userId });
      throw new Error('UNAUTHORIZED');
    }
  },
};
