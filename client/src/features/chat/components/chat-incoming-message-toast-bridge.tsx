'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useStore } from 'react-redux';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import type { RootState } from '@/lib/redux/store';
import { conversationFromCache } from '../lib/conversation-from-cache';
import { shouldToastIncomingMessage, showIncomingMessageToast } from '../lib/incoming-message-toast';
import type { Message } from '../types/chat.types';

/** Toast when a peer message arrives while the user is not viewing that thread. */
export function ChatIncomingMessageToastBridge() {
  const router = useRouter();
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
    if (!socket || !currentUserId) return;

    const onNew = (msg: Message) => {
      if (!shouldToastIncomingMessage(msg, currentUserId, activeRef.current)) return;

      const conv = conversationFromCache(() => store.getState(), msg.conversationId);
      showIncomingMessageToast(msg, conv, (path) => router.push(path));
    };

    socket.on('chat:message:new', onNew);
    return () => {
      socket.off('chat:message:new', onNew);
    };
  }, [socket, currentUserId, store, router]);

  return null;
}
