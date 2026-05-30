import { toast } from 'sonner';
import { isMessagingBlocked } from './messaging-block';
import { messageSenderLabel, messageToastPreview } from './message-toast-preview';
import { messagesConversationPath } from './messages-routes';
import type { Conversation, Message } from '../types/chat.types';

export function shouldToastIncomingMessage(
  msg: Message,
  currentUserId: string,
  activeConversationId: string | null,
  conv: Conversation | undefined,
): boolean {
  if (!msg.senderId || msg.senderId === currentUserId) return false;
  if (msg.messageType === 'system') return false;
  if (activeConversationId && msg.conversationId === activeConversationId) return false;
  if (isMessagingBlocked(conv?.messagingBlock)) return false;
  return true;
}

export function showIncomingMessageToast(
  msg: Message,
  conv: Conversation | undefined,
  navigate: (path: string) => void,
): void {
  const path = messagesConversationPath(msg.conversationId, conv?.type ?? 'connection');
  toast.message(messageSenderLabel(msg.sender), {
    id: msg.id,
    description: messageToastPreview(msg),
    action: {
      label: 'View',
      onClick: () => navigate(path),
    },
  });
}
