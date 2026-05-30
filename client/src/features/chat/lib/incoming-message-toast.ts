import { toast } from 'sonner';
import { messageSenderLabel, messageToastPreview } from './message-toast-preview';
import { messagesConversationPath } from './messages-routes';
import type { Conversation, Message } from '../types/chat.types';

export function shouldToastIncomingMessage(
  msg: Message,
  currentUserId: string,
  activeConversationId: string | null,
): boolean {
  if (!msg.senderId || msg.senderId === currentUserId) return false;
  if (msg.messageType === 'system') return false;
  if (activeConversationId && msg.conversationId === activeConversationId) return false;
  return true;
}

export function showIncomingMessageToast(
  msg: Message,
  conv: Conversation | undefined,
  navigate: (path: string) => void,
): void {
  toast.message(messageSenderLabel(msg.sender), {
    id: msg.id,
    description: messageToastPreview(msg),
    action: conv
      ? {
          label: 'View',
          onClick: () => navigate(messagesConversationPath(msg.conversationId, conv.type)),
        }
      : undefined,
  });
}
