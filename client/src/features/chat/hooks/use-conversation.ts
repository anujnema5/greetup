'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import { chatApi, useGetMessagesQuery } from '../api/chat-api';
import { typingSet, unreadCountReset, activeConversationSet } from '../slices/chat.slice';
import type { AppDispatch, RootState } from '@/lib/redux/store';
import type {
  ConversationType,
  Message,
  TypingPayload,
  ReadPayload,
} from '../types/chat.types';

export function useConversation(
  conversationId: string,
  opts?: { conversationType?: ConversationType },
) {
  const dispatch = useDispatch<AppDispatch>();
  const { chatSocket: socket } = useSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const conversationType = opts?.conversationType;

  const hasJoined = useRef(false);

  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching } = useGetMessagesQuery({ conversationId, cursor });

  const typingUsers = useSelector(
    (s: RootState) => s.chat.typingState[conversationId] ?? {},
  );

  const allMessages = useMemo(() => {
    const list = data?.messages ?? [];
    return [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [data]);

  const lastMessageId = allMessages.length ? allMessages[allMessages.length - 1]!.id : undefined;

  useEffect(() => {
    dispatch(activeConversationSet(conversationId));
    return () => {
      dispatch(activeConversationSet(null));
    };
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

    const onTypingStart = (p: TypingPayload) => {
      if (p.conversationId !== conversationId) return;
      dispatch(typingSet({ conversationId, userId: p.userId, isTyping: true }));
    };

    const onTypingStop = (p: TypingPayload) => {
      if (p.conversationId !== conversationId) return;
      dispatch(typingSet({ conversationId, userId: p.userId, isTyping: false }));
    };

    const onPeerRead = (p: ReadPayload) => {
      if (p.conversationId !== conversationId) return;
      if (!currentUserId || p.userId === currentUserId) return;
      if (conversationType === 'room_circle') return;

      dispatch(chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
        for (const m of draft.messages) {
          if (m.senderId === currentUserId && m.status !== 'failed' && !m.isDeleted) {
            m.status = 'read';
          }
        }
      }));
    };

    socket.on('chat:typing:start', onTypingStart);
    socket.on('chat:typing:stop', onTypingStop);
    socket.on('chat:message:read', onPeerRead);

    return () => {
      socket.off('chat:typing:start', onTypingStart);
      socket.off('chat:typing:stop', onTypingStop);
      socket.off('chat:message:read', onPeerRead);
    };
  }, [socket, conversationId, dispatch, currentUserId, conversationType]);

  useEffect(() => {
    if (!socket || !lastMessageId || lastMessageId.startsWith('temp_')) return;
    const t = window.setTimeout(() => {
      socket.emit('chat:message:read', { conversationId, messageId: lastMessageId });
      dispatch(unreadCountReset(conversationId));
    }, 400);
    return () => window.clearTimeout(t);
  }, [socket, conversationId, lastMessageId, dispatch]);

  const loadMore = useCallback(() => {
    if (data?.nextCursor && !isFetching) {
      setCursor(data.nextCursor);
    }
  }, [data?.nextCursor, isFetching]);

  return {
    messages:    allMessages,
    isLoading,
    isFetching,
    hasMore:     !!data?.nextCursor,
    typingUsers,
    loadMore,
    currentUserId,
  };
}
