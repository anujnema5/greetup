'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import type { AppDispatch, RootState } from '@/lib/redux/store';
import {
  applySocketDeletedMessage,
  applySocketEditedMessage,
  applySocketNewMessage,
  applySocketReactionUpdate,
} from '../lib/message-rtk-sync';
import { unreadCountReset } from '../slices/chat.slice';
import type { Message, MessageDeletedPayload, ReactionUpdatePayload } from '../types/chat.types';

export function ChatMessagesCacheBridge() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const { chatSocket: socket } = useSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? '';
  const activeConversationId = useSelector((s: RootState) => s.chat.activeConversationId);
  const activeRef = useRef(activeConversationId);

  useLayoutEffect(() => {
    activeRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!socket) return;
    const getState = () => store.getState();

    const onNew = (msg: Message) => {
      applySocketNewMessage(dispatch, getState, msg, currentUserId);
      const active = activeRef.current;
      if (
        active &&
        msg.conversationId === active &&
        msg.senderId &&
        msg.senderId !== currentUserId
      ) {
        dispatch(unreadCountReset(msg.conversationId));
      }
    };
    const onEdited = (msg: Message) => applySocketEditedMessage(dispatch, msg);
    const onDeleted = (p: MessageDeletedPayload) => applySocketDeletedMessage(dispatch, p);
    const onReaction = (p: ReactionUpdatePayload) => applySocketReactionUpdate(dispatch, p);

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
  }, [socket, dispatch, store, currentUserId]);

  return null;
}
