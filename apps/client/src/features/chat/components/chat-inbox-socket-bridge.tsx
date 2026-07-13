'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/lib/socket/provider';
import { queryKeys } from '@/lib/query/keys';
import { fetchConversation, fetchConversations } from '../api/chat.queries';
import { applyConversationActivityToInbox } from '../lib/inbox-order';
import { useChatUiStore } from '../state/chat-ui.store';

export function ChatInboxSocketBridge() {
  const qc = useQueryClient();
  const { chatSocket } = useSocket();

  useEffect(() => {
    if (!chatSocket) return;

    const onSync = (p: { conversationId: string; unreadCount: number }) => {
      useChatUiStore.getState().setUnreadCount({
        conversationId: p.conversationId,
        count: p.unreadCount,
      });
    };

    const onActivity = (p: {
      conversationId: string;
      lastActivityAt?: string;
      lastMessagePreview?: string | null;
    }) => {
      const { conversationId, ...patch } = p;
      const hit = applyConversationActivityToInbox(qc, conversationId, patch);

      void qc.invalidateQueries({ queryKey: queryKeys.chat.conversation(conversationId) });
      void qc.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });

      if (!hit) {
        void qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
        void qc.fetchQuery({
          queryKey: queryKeys.chat.conversations,
          queryFn: fetchConversations,
        });
      }

      void qc.fetchQuery({
        queryKey: queryKeys.chat.conversation(conversationId),
        queryFn: () => fetchConversation(conversationId),
      });
    };

    chatSocket.on('chat:unread:sync', onSync);
    chatSocket.on('chat:conversation:activity', onActivity);
    return () => {
      chatSocket.off('chat:unread:sync', onSync);
      chatSocket.off('chat:conversation:activity', onActivity);
    };
  }, [chatSocket, qc]);

  return null;
}
