import {
  assertMessagingAllowed,
  resolveMessagingBlockStatus,
} from '@/modules/blocks/lib/messaging-block-status';
import { getDmPeerUserId } from '@/modules/blocks/lib/dm-peer';
import type {
  ConversationWithParticipants,
  MessagingBlockStatus,
} from '@/modules/blocks/types/messaging-block.types';
import { conversationRepository } from '../repositories/conversation.repository';

export { getDmPeerUserId } from '@/modules/blocks/lib/dm-peer';

export async function getMessagingBlockForConversation(
  conversation: ConversationWithParticipants,
  viewerId: string,
): Promise<MessagingBlockStatus> {
  const peerId = getDmPeerUserId(conversation, viewerId);
  if (!peerId) return { isBlocked: false };
  return resolveMessagingBlockStatus(viewerId, peerId);
}

export async function assertCanMessageInConversation(
  conversationId: string,
  senderId: string,
): Promise<void> {
  const conv = await conversationRepository.findById(conversationId);
  if (!conv) throw new Error('NOT_FOUND');

  const peerId = getDmPeerUserId(conv, senderId);
  if (!peerId) return;

  await assertMessagingAllowed(senderId, peerId);
}

export function attachMessagingBlock<T extends ConversationWithParticipants>(
  conversation: T,
  messagingBlock: MessagingBlockStatus,
): T & { messagingBlock: MessagingBlockStatus } {
  return { ...conversation, messagingBlock };
}
