'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { useSocket } from '@/lib/socket/provider';
import type { AppDispatch } from '@/lib/redux/store';
import { CHAT_SOCKET_ERROR } from '../../constants/messaging-block.constants';
import {
  invalidateAllConversationsCache,
  messagingBlockInteractionToast,
} from '../../lib/messaging-block';
import type { MessagingBlockSocketPayload } from '../../types/messaging-block.types';

const INTERACTION_EVENTS = new Set([
  'chat:message:edit',
  'chat:reaction:add',
  'chat:reaction:remove',
  'chat:typing:start',
]);

/** Keeps conversation block state in sync when someone blocks / unblocks mid-session. */
export function ChatMessagingBlockBridge() {
  const dispatch = useDispatch<AppDispatch>();
  const { chatSocket } = useSocket();

  useEffect(() => {
    if (!chatSocket) return;

    const refreshConversations = () => invalidateAllConversationsCache(dispatch);

    const onMessagingBlock = (_payload: MessagingBlockSocketPayload) => {
      refreshConversations();
    };

    const onChatError = (payload: { code?: string; event?: string }) => {
      if (payload.code !== CHAT_SOCKET_ERROR.MESSAGING_BLOCKED) return;
      refreshConversations();
      if (payload.event && INTERACTION_EVENTS.has(payload.event)) {
        toast.error(messagingBlockInteractionToast());
      }
    };

    chatSocket.on('chat:messaging:block', onMessagingBlock);
    chatSocket.on('chat:error', onChatError);

    return () => {
      chatSocket.off('chat:messaging:block', onMessagingBlock);
      chatSocket.off('chat:error', onChatError);
    };
  }, [chatSocket, dispatch]);

  return null;
}
