'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import { useMessages } from '../api/chat.queries';
import { markOwnMessagesReadInCache } from '../lib/message-cache-sync';
import { bindChatConversationSocket } from '../lib/chat-conversation-socket-membership';
import { useChatUiStore } from '../state/chat-ui.store';
import type {
  ConversationType,
  Message,
  TypingPayload,
  ReadPayload,
} from '../types/chat.types';

const EMPTY_TYPING_USERS: Record<string, boolean> = {};

export function useConversation(
  conversationId: string,
  opts?: { conversationType?: ConversationType },
) {
  const qc = useQueryClient();
  const { chatSocket: socket } = useSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const conversationType = opts?.conversationType;

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(conversationId);

  const typingUsers = useChatUiStore(
    (s) => s.typingState[conversationId] ?? EMPTY_TYPING_USERS,
  );

  const allMessages = useMemo(() => {
    const byId = new Map<string, Message>();
    for (const page of data?.pages ?? []) {
      for (const m of page.messages) {
        byId.set(m.id, m);
      }
    }
    return [...byId.values()].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [data]);

  const lastMessageId = allMessages.length ? allMessages[allMessages.length - 1]!.id : undefined;

  useEffect(() => {
    const { setActiveConversation } = useChatUiStore.getState();
    setActiveConversation(conversationId);
    return () => {
      setActiveConversation(null);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;
    return bindChatConversationSocket(socket, conversationId);
  }, [socket, conversationId]);

  useEffect(() => {
    if (!socket) return;

    const { setTyping } = useChatUiStore.getState();

    const onTypingStart = (p: TypingPayload) => {
      if (p.conversationId !== conversationId) return;
      setTyping({ conversationId, userId: p.userId, isTyping: true });
    };

    const onTypingStop = (p: TypingPayload) => {
      if (p.conversationId !== conversationId) return;
      setTyping({ conversationId, userId: p.userId, isTyping: false });
    };

    const onPeerRead = (p: ReadPayload) => {
      if (p.conversationId !== conversationId) return;
      if (!currentUserId || p.userId === currentUserId) return;
      if (conversationType === 'room_space') return;

      markOwnMessagesReadInCache(qc, conversationId, currentUserId);
    };

    socket.on('chat:typing:start', onTypingStart);
    socket.on('chat:typing:stop', onTypingStop);
    socket.on('chat:message:read', onPeerRead);

    return () => {
      socket.off('chat:typing:start', onTypingStart);
      socket.off('chat:typing:stop', onTypingStop);
      socket.off('chat:message:read', onPeerRead);
    };
  }, [socket, conversationId, qc, currentUserId, conversationType]);

  useEffect(() => {
    if (!socket || !lastMessageId || lastMessageId.startsWith('temp_')) return;
    const t = window.setTimeout(() => {
      socket.emit('chat:message:read', { conversationId, messageId: lastMessageId });
      useChatUiStore.getState().resetUnreadCount(conversationId);
    }, 400);
    return () => window.clearTimeout(t);
  }, [socket, conversationId, lastMessageId]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    messages: allMessages,
    isLoading,
    isFetching: isFetching || isFetchingNextPage,
    hasMore: hasNextPage,
    typingUsers,
    loadMore,
    currentUserId,
  };
}
