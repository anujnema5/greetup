'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSocket } from '@/lib/socket/provider';
import { chatApi } from '../api/chat-api';
import { applyConversationActivityToInbox } from '../lib/inbox-order';
import { unreadCountSet } from '../slices/chat.slice';
import type { AppDispatch } from '@/lib/redux/store';

export function ChatInboxSocketBridge() {
  const dispatch = useDispatch<AppDispatch>();
  const { chatSocket } = useSocket();

  useEffect(() => {
    if (!chatSocket) return;

    const onSync = (p: { conversationId: string; unreadCount: number }) => {
      dispatch(
        unreadCountSet({
          conversationId: p.conversationId,
          count:          p.unreadCount,
        }),
      );
    };

    const onActivity = (p: {
      conversationId: string;
      lastActivityAt?: string;
      lastMessagePreview?: string | null;
    }) => {
      const { conversationId, ...patch } = p;
      const hit = applyConversationActivityToInbox(dispatch, conversationId, patch);

      // Always refresh thread detail + messages — stale 403 cache after delete breaks reopen.
      dispatch(
        chatApi.util.invalidateTags([
          { type: 'Conversations', id: conversationId },
          { type: 'Messages', id: conversationId },
        ]),
      );

      if (!hit) {
        dispatch(chatApi.util.invalidateTags([{ type: 'Conversations', id: 'LIST' }]));
        void dispatch(chatApi.endpoints.listConversations.initiate(undefined, { forceRefetch: true }));
      }

      void dispatch(
        chatApi.endpoints.getConversation.initiate(conversationId, { forceRefetch: true }),
      );
    };

    chatSocket.on('chat:unread:sync', onSync);
    chatSocket.on('chat:conversation:activity', onActivity);
    return () => {
      chatSocket.off('chat:unread:sync', onSync);
      chatSocket.off('chat:conversation:activity', onActivity);
    };
  }, [chatSocket, dispatch]);

  return null;
}