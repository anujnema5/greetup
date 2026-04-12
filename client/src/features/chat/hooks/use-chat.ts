'use client';

import { useCallback } from 'react';
import { useDispatch, useStore } from 'react-redux';
import { toast } from 'sonner';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import { chatApi } from '../api/chat-api';
import { applyConversationActivityToInbox } from '../lib/inbox-order';
import {
  patchMessageInGetMessagesCache,
  pushOptimisticMessage,
} from '../lib/message-rtk-sync';
import type { AppDispatch, RootState } from '@/lib/redux/store';
import type { Message } from '../types/chat.types';

function syncInboxAfterSendAck(dispatch: AppDispatch, conversationId: string): void {
  const hit = applyConversationActivityToInbox(dispatch, conversationId, {
    lastActivityAt: new Date().toISOString(),
  });
  if (!hit) {
    dispatch(chatApi.util.invalidateTags([{ type: 'Conversations', id: 'LIST' }]));
  }
  dispatch(chatApi.util.invalidateTags([{ type: 'Messages', id: conversationId }]));
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
    id:             params.tempId,
    conversationId: params.conversationId,
    senderId:       myId,
    sender:         me
      ? {
          id:          me.id,
          name:        me.name ?? '',
          displayName: me.name ?? null,
          image:       me.image ?? null,
        }
      : undefined,
    content:       params.content,
    messageType:   params.messageType ?? 'text',
    replyToId:     params.replyToId ?? null,
    mentions:      params.mentions ?? null,
    systemPayload: null,
    editedAt:      null,
    isDeleted:     false,
    deletedForAll: false,
    createdAt:     new Date().toISOString(),
    status:        'sending',
  };
}

export function useChat(conversationId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { chatSocket: socket } = useSocket();
  const { data: session } = useSession();
  const me = session?.user;

  const sendMessage = useCallback(
    (params: {
      content: string;
      messageType?: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
      replyToId?: string;
      mentions?: string[];
    }) => {
      const tempId = `temp_${Date.now()}`;
      const optimisticMsg = buildOptimisticMessage(
        { tempId, conversationId, ...params },
        me,
      );

      pushOptimisticMessage(dispatch, () => store.getState(), conversationId, optimisticMsg);

      socket.emit(
        'chat:message:send',
        { conversationId, ...params },
        (ack: { success: boolean; messageId?: string; error?: string }) => {
          if (ack.success && ack.messageId) {
            syncInboxAfterSendAck(dispatch, conversationId);
          } else {
            if (ack.error === 'RATE_LIMITED') {
              toast.error('You are sending too quickly. Wait a moment and try again.');
            }
            patchMessageInGetMessagesCache(dispatch, conversationId, tempId, {
              status: 'failed',
            });
          }
        },
      );

      return tempId;
    },
    [socket, dispatch, store, conversationId, me],
  );

  const retryFailedMessage = useCallback(
    (failed: Message) => {
      if (failed.status !== 'failed') return;
      dispatch(
        chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
          draft.messages = draft.messages.filter((m) => m.id !== failed.id);
        }),
      );
      sendMessage({
        content:   failed.content,
        replyToId: failed.replyToId ?? undefined,
      });
    },
    [conversationId, dispatch, sendMessage],
  );

  const markRead = useCallback(
    (messageId: string) => {
      socket.emit('chat:message:read', { conversationId, messageId });
    },
    [socket, conversationId],
  );

  const editMessage = useCallback(
    (messageId: string, content: string) => {
      socket.emit('chat:message:edit', { conversationId, messageId, content });
    },
    [socket, conversationId],
  );

  const deleteMessage = useCallback(
    (messageId: string, deleteForAll = false) => {
      socket.emit('chat:message:delete', { conversationId, messageId, deleteForAll });
    },
    [socket, conversationId],
  );

  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      socket.emit('chat:reaction:add', { conversationId, messageId, emoji });
    },
    [socket, conversationId],
  );

  const removeReaction = useCallback(
    (messageId: string, emoji: string) => {
      socket.emit('chat:reaction:remove', { conversationId, messageId, emoji });
    },
    [socket, conversationId],
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
