import { conversationRepository } from '../repositories/conversation.repository';

export const conversationService = {
  async listForUser(userId: string) {
    const convs = await conversationRepository.listForUser(userId);
    return convs.filter(Boolean);
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
