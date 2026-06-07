'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import {
  applySocketDeletedMessage,
  applySocketEditedMessage,
  applySocketNewMessage,
  applySocketReactionUpdate,
} from '../lib/message-cache-sync';
import { useChatUiStore } from '../state/chat-ui.store';
import type { Message, MessageDeletedPayload, ReactionUpdatePayload } from '../types/chat.types';

/** Keeps message React Query cache in sync with chat socket events. */
export function ChatMessagesCacheBridge() {
  const qc = useQueryClient();
  const { chatSocket: socket } = useSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const activeConversationId = useChatUiStore((s) => s.activeConversationId);
  const activeRef = useRef(activeConversationId);

  useLayoutEffect(() => {
    activeRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const onNew = (msg: Message) => {
      applySocketNewMessage(qc, msg, currentUserId);

      const active = activeRef.current;
      if (
        active &&
        msg.conversationId === active &&
        msg.senderId &&
        msg.senderId !== currentUserId
      ) {
        useChatUiStore.getState().resetUnreadCount(msg.conversationId);
      }
    };

    const onEdited = (msg: Message) => applySocketEditedMessage(qc, msg);
    const onDeleted = (p: MessageDeletedPayload) => applySocketDeletedMessage(qc, p);
    const onReaction = (p: ReactionUpdatePayload) => applySocketReactionUpdate(qc, p);

    socket.on('chat:message:new', onNew);
    socket.on('chat:message:edited', onEdited);
    socket.on('chat:message:deleted', onDeleted);
    socket.on('chat:reaction:update', onReaction);

    return () => {
      socket.off('chat:message:new', onNew);
      socket.off('chat:message:edited', onEdited);
      socket.off('chat:message:deleted', onDeleted);
      socket.off('chat:reaction:update', onReaction);
    };
  }, [socket, qc, currentUserId]);

  return null;
}
