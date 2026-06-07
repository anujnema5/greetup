'use client';

import { useCallback } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import { queryKeys } from '@/lib/query/keys';
import { CHAT_SOCKET_ERROR } from '../constants/messaging-block.constants';
import { applyConversationActivityToInbox } from '../lib/inbox-order';
import {
  invalidateConversationCache,
  messagingBlockSendToast,
} from '../lib/messaging-block';
import {
  patchMessageInCache,
  pushOptimisticMessage,
  removeMessageFromCache,
} from '../lib/message-cache-sync';
import type { Message, MessagingBlock } from '../types/chat.types';

function syncInboxAfterSendAck(qc: QueryClient, conversationId: string) {
  const hit = applyConversationActivityToInbox(qc, conversationId, {
    lastActivityAt: new Date().toISOString(),
  });
  if (!hit) {
    void qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
  }
  void qc.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });
}

function buildOptimisticMessage(
  params: {
    tempId: string;
    conversationId: string;
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
    replyToId?: string;
    mentions?: string[];
  },
  me: { id: string; name?: string | null; image?: string | null } | undefined,
): Message {
  const myId = me?.id ?? '';
  return {
    id: params.tempId,
    conversationId: params.conversationId,
    senderId: myId,
    sender: me
      ? {
          id: me.id,
          name: me.name ?? '',
          displayName: me.name ?? null,
          image: me.image ?? null,
        }
      : undefined,
    content: params.content,
    messageType: params.messageType ?? 'text',
    replyToId: params.replyToId ?? null,
    mentions: params.mentions ?? null,
    systemPayload: null,
    editedAt: null,
    isDeleted: false,
    deletedForAll: false,
    createdAt: new Date().toISOString(),
    status: 'sending',
  };
}

type UseChatOptions = {
  /** When false, send / edit / react / delete are no-ops. */
  interactionsEnabled?: boolean;
  messagingBlock?: MessagingBlock;
};

export function useChat(conversationId: string, options?: UseChatOptions) {
  const qc = useQueryClient();
  const { chatSocket: socket } = useSocket();
  const { data: session } = useSession();
  const me = session?.user;
  const interactionsEnabled = options?.interactionsEnabled ?? true;
  const messagingBlock = options?.messagingBlock;

  const sendMessage = useCallback(
    (params: {
      content: string;
      messageType?: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
      replyToId?: string;
      mentions?: string[];
    }) => {
      if (!interactionsEnabled) return null;

      const tempId = `temp_${Date.now()}`;
      const optimisticMsg = buildOptimisticMessage(
        { tempId, conversationId, ...params },
        me,
      );

      pushOptimisticMessage(qc, conversationId, optimisticMsg);

      socket.emit(
        'chat:message:send',
        { conversationId, ...params },
        (ack: { success: boolean; messageId?: string; error?: string }) => {
          if (ack.success && ack.messageId) {
            syncInboxAfterSendAck(qc, conversationId);
            return;
          }

          if (ack.error === CHAT_SOCKET_ERROR.RATE_LIMITED) {
            toast.error('You are sending too quickly. Wait a moment and try again.');
          } else if (ack.error === CHAT_SOCKET_ERROR.MESSAGING_BLOCKED) {
            toast.error(messagingBlockSendToast(messagingBlock));
            invalidateConversationCache(conversationId, qc);
          }

          patchMessageInCache(qc, conversationId, tempId, {
            status: 'failed',
          });
        },
      );

      return tempId;
    },
    [socket, qc, conversationId, me, interactionsEnabled, messagingBlock],
  );

  const retryFailedMessage = useCallback(
    (failed: Message) => {
      if (!interactionsEnabled || failed.status !== 'failed') return;
      removeMessageFromCache(qc, conversationId, failed.id);
      sendMessage({
        content: failed.content,
        replyToId: failed.replyToId ?? undefined,
      });
    },
    [conversationId, qc, sendMessage, interactionsEnabled],
  );

  const markRead = useCallback(
    (messageId: string) => {
      socket.emit('chat:message:read', { conversationId, messageId });
    },
    [socket, conversationId],
  );

  const editMessage = useCallback(
    (messageId: string, content: string) => {
      if (!interactionsEnabled) return;
      socket.emit('chat:message:edit', { conversationId, messageId, content });
    },
    [socket, conversationId, interactionsEnabled],
  );

  const deleteMessage = useCallback(
    (messageId: string, deleteForAll = false) => {
      if (!interactionsEnabled) return;
      socket.emit('chat:message:delete', { conversationId, messageId, deleteForAll });
    },
    [socket, conversationId, interactionsEnabled],
  );

  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!interactionsEnabled) return;
      socket.emit('chat:reaction:add', { conversationId, messageId, emoji });
    },
    [socket, conversationId, interactionsEnabled],
  );

  const removeReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!interactionsEnabled) return;
      socket.emit('chat:reaction:remove', { conversationId, messageId, emoji });
    },
    [socket, conversationId, interactionsEnabled],
  );

  return {
    sendMessage,
    retryFailedMessage,
    markRead,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
  };
}
