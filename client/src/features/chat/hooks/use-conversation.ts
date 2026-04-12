'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '@/lib/socket/provider';
import { chatApi, useGetMessagesQuery } from '../api/chat-api';
import {
  messageReceived,
  messageUpdated,
  typingSet,
  unreadCountReset,
  activeConversationSet,
} from '../slices/chat.slice';
import type { AppDispatch, RootState } from '@/lib/redux/store';
import type {
  Message,
  TypingPayload,
  ReadPayload,
  ReactionUpdatePayload,
  MessageDeletedPayload,
} from '../types/chat.types';

export function useConversation(conversationId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const { chatSocket: socket } = useSocket();
  const hasJoined = useRef(false);

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching } = useGetMessagesQuery({ conversationId, cursor });

  const incomingMessages = useSelector(
    (s: RootState) => s.chat.incomingMessages[conversationId] ?? [],
  );

  const typingUsers = useSelector(
    (s: RootState) => s.chat.typingState[conversationId] ?? {},
  );

  const allMessages = (() => {
    if (!data) return incomingMessages;
    const cached = data.messages;
    const cachedIds = new Set(cached.map((m) => m.id));
    const extras = incomingMessages.filter((m) => !cachedIds.has(m.id));
    return [...cached, ...extras].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  })();

  useEffect(() => {
    dispatch(activeConversationSet(conversationId));
    return () => { dispatch(activeConversationSet(null)); };
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (!socket || hasJoined.current) return;
    socket.emit('chat:room:join', conversationId);
    hasJoined.current = true;

    return () => {
      socket.emit('chat:room:leave', conversationId);
      hasJoined.current = false;
    };
  }, [socket, conversationId]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (msg: Message) => {
      dispatch(chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
        const exists = draft.messages.some((m) => m.id === msg.id);
        if (!exists) draft.messages.push({ ...msg, status: 'delivered' });
      }));
    };

    const onEdited = (msg: Message) => {
      dispatch(chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
        const idx = draft.messages.findIndex((m) => m.id === msg.id);
        if (idx !== -1) Object.assign(draft.messages[idx], msg);
      }));
    };

    const onDeleted = (payload: MessageDeletedPayload) => {
      if (payload.conversationId !== conversationId) return;
      dispatch(chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
        const idx = draft.messages.findIndex((m) => m.id === payload.messageId);
        if (idx !== -1) {
          draft.messages[idx].isDeleted = true;
          draft.messages[idx].deletedForAll = payload.deletedForAll;
          draft.messages[idx].content = '';
        }
      }));
    };

    const onTypingStart = (payload: TypingPayload) => {
      if (payload.conversationId !== conversationId) return;
      dispatch(typingSet({ conversationId, userId: payload.userId, isTyping: true }));
    };

    const onTypingStop = (payload: TypingPayload) => {
      if (payload.conversationId !== conversationId) return;
      dispatch(typingSet({ conversationId, userId: payload.userId, isTyping: false }));
    };

    socket.on('chat:message:new', onNew);
    socket.on('chat:message:edited', onEdited);
    socket.on('chat:message:deleted', onDeleted);
    socket.on('chat:typing:start', onTypingStart);
    socket.on('chat:typing:stop', onTypingStop);

    return () => {
      socket.off('chat:message:new', onNew);
      socket.off('chat:message:edited', onEdited);
      socket.off('chat:message:deleted', onDeleted);
      socket.off('chat:typing:start', onTypingStart);
      socket.off('chat:typing:stop', onTypingStop);
    };
  }, [socket, conversationId, dispatch]);

  const loadMore = useCallback(() => {
    if (data?.nextCursor && !isFetching) {
      setCursor(data.nextCursor);
    }
  }, [data?.nextCursor, isFetching]);

  return {
    messages: allMessages,
    isLoading,
    isFetching,
    hasMore: !!data?.nextCursor,
    typingUsers,
    loadMore,
  };
}
