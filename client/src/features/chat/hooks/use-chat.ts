'use client';

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import { chatApi } from '../api/chat-api';
import {
  messageReceived,
  messageUpdated,
  optimisticIdRegistered,
} from '../slices/chat.slice';
import { store, type AppDispatch } from '@/lib/redux/store';
import type { Message } from '../types/chat.types';

/**
 * After the server accepts an outgoing message: bump this thread in the cached
 * inbox when needed, then invalidate RTK tags (skip inbox refetch if it was
 * already on top to avoid extra list requests).
 */
function syncInboxAndCachesAfterSendAck(
  dispatch: AppDispatch,
  conversationId: string,
): void {
  const inboxRows =
    chatApi.endpoints.listConversations.select(undefined)(store.getState()).data;
  const threadAlreadyFirst = inboxRows?.[0]?.id === conversationId;

  if (!threadAlreadyFirst) {
    dispatch(
      chatApi.util.updateQueryData('listConversations', undefined, (draft) => {
        const i = draft.findIndex((c) => c.id === conversationId);
        if (i <= 0) return;
        const [row] = draft.splice(i, 1);
        draft.unshift(row);
      }),
    );
  }

  const messagesTag = { type: 'Messages' as const, id: conversationId };
  const listTag = { type: 'Conversations' as const, id: 'LIST' as const };
  dispatch(
    chatApi.util.invalidateTags(
      threadAlreadyFirst ? [messagesTag] : [messagesTag, listTag],
    ),
  );
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
    content:        params.content,
    messageType:    params.messageType ?? 'text',
    replyToId:      params.replyToId ?? null,
    mentions:       params.mentions ?? null,
    systemPayload:  null,
    editedAt:       null,
    isDeleted:      false,
    deletedForAll:  false,
    createdAt:      new Date().toISOString(),
    status:         'sending',
    optimisticId:   params.tempId,
  };
}

export function useChat(conversationId: string) {
  const dispatch = useDispatch<AppDispatch>();
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

      dispatch(messageReceived({ conversationId, message: optimisticMsg }));

      socket.emit(
        'chat:message:send',
        { conversationId, ...params },
        (ack: { success: boolean; messageId?: string; error?: string }) => {
          if (ack.success && ack.messageId) {
            dispatch(optimisticIdRegistered({ tempId, realId: ack.messageId }));
            dispatch(
              messageUpdated({
                conversationId,
                messageId: tempId,
                changes:   { id: ack.messageId, status: 'delivered' },
              }),
            );
            syncInboxAndCachesAfterSendAck(dispatch, conversationId);
          } else {
            dispatch(
              messageUpdated({
                conversationId,
                messageId: tempId,
                changes:   { status: 'failed' },
              }),
            );
          }
        },
      );

      return tempId;
    },
    [socket, dispatch, conversationId, me],
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

  return { sendMessage, markRead, editMessage, deleteMessage, addReaction, removeReaction };
}
