'use client';

import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useSocket } from '@/lib/socket/provider';
import { chatApi } from '../api/chat-api';
import {
  messageReceived,
  messageUpdated,
  optimisticIdRegistered,
} from '../slices/chat.slice';
import type { AppDispatch } from '@/lib/redux/store';
import type { Message } from '../types/chat.types';

export function useChat(conversationId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { chatSocket: socket } = useSocket();

  const sendMessage = useCallback((params: {
    content: string;
    messageType?: 'text' | 'image' | 'video' | 'file' | 'voice' | 'gif';
    replyToId?: string;
    mentions?: string[];
  }) => {
    const tempId = `temp_${Date.now()}`;

    // Optimistic update
    const optimisticMsg: Message = {
      id:             tempId,
      conversationId,
      senderId:       '',     // filled when ack returns
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
      optimisticId:   tempId,
    };

    dispatch(messageReceived({ conversationId, message: optimisticMsg }));

    socket.emit(
      'chat:message:send',
      { conversationId, ...params },
      (ack: { success: boolean; messageId?: string; error?: string }) => {
        if (ack.success && ack.messageId) {
          dispatch(optimisticIdRegistered({ tempId, realId: ack.messageId }));
          dispatch(messageUpdated({
            conversationId,
            messageId: tempId,
            changes:   { id: ack.messageId, status: 'delivered' },
          }));
          // Invalidate RTK Query cache so next load is fresh
          dispatch(chatApi.util.invalidateTags([{ type: 'Messages', id: conversationId }]));
        } else {
          dispatch(messageUpdated({
            conversationId,
            messageId: tempId,
            changes:   { status: 'failed' },
          }));
        }
      },
    );

    return tempId;
  }, [socket, dispatch, conversationId]);

  const markRead = useCallback((messageId: string) => {
    socket.emit('chat:message:read', { conversationId, messageId });
  }, [socket, conversationId]);

  const editMessage = useCallback((messageId: string, content: string) => {
    socket.emit('chat:message:edit', { conversationId, messageId, content });
  }, [socket, conversationId]);

  const deleteMessage = useCallback((messageId: string, deleteForAll = false) => {
    socket.emit('chat:message:delete', { conversationId, messageId, deleteForAll });
  }, [socket, conversationId]);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    socket.emit('chat:reaction:add', { conversationId, messageId, emoji });
  }, [socket, conversationId]);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    socket.emit('chat:reaction:remove', { conversationId, messageId, emoji });
  }, [socket, conversationId]);

  return { sendMessage, markRead, editMessage, deleteMessage, addReaction, removeReaction };
}
