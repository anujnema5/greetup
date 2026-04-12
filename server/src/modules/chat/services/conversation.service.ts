import { desc, inArray, max } from 'drizzle-orm';
import { db } from '@/core/database';
import { messages } from '@/core/database/schema';
import { conversationRepository } from '../repositories/conversation.repository';

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
    return activityRows
      .map((r) => convById.get(r.conversationId))
      .filter((c): c is NonNullable<typeof c> => c != null);
  },

  async getById(conversationId: string, userId: string) {
    const conv = await conversationRepository.findById(conversationId);
    if (!conv) return null;

    const isMember = conv.participants.some((p) => p.userId === userId);
    if (!isMember) throw new Error('UNAUTHORIZED');

    return conv;
  },

  async getOrCreateConnectionConversation(userA: string, userB: string) {
    return conversationRepository.findOrCreateConnectionConversation(userA, userB);
  },

  async setPersistence(conversationId: string, userId: string, wantsPersistence: boolean) {
    const isMember = await conversationRepository.isParticipant(conversationId, userId);
    if (!isMember) throw new Error('UNAUTHORIZED');
    await conversationRepository.setPersistence(conversationId, userId, wantsPersistence);
  },

  async assertParticipant(conversationId: string, userId: string): Promise<void> {
    const isMember = await conversationRepository.isParticipant(conversationId, userId);
    if (!isMember) throw new Error('UNAUTHORIZED');
  },
};
