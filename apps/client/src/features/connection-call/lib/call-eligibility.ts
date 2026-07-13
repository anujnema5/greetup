import type { Conversation } from '@/features/chat/types/chat.types';

export function canCallFromConversation(conversation: Conversation): boolean {
  return conversation.type === 'connection' || conversation.type === 'room_direct';
}
