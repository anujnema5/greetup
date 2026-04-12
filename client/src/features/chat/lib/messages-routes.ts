import type { ConversationType } from '../types/chat.types';

export type MessagesUrlKind = 'd' | 'c';

export function conversationTypeToUrlKind(type: ConversationType): MessagesUrlKind {
  return type === 'room_circle' ? 'c' : 'd';
}

export function messagesConversationPath(conversationId: string, type: ConversationType): string {
  return `/messages/${conversationTypeToUrlKind(type)}/${conversationId}`;
}

export function isMessagesUrlKind(value: string): value is MessagesUrlKind {
  return value === 'd' || value === 'c';
}
