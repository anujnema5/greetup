'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import { markRoomMinimized } from '@/features/room/lib/session/room-sync';
import { useRoomStore } from '@/features/room/state/room.store';
import { conversationFromCache } from '../lib/conversation-from-cache';
import { shouldToastIncomingMessage, showIncomingMessageToast } from '../lib/incoming-message-toast';
import { useChatUiStore } from '../state/chat-ui.store';
import type { Message } from '../types/chat.types';

/** Keep the live call as a dock when leaving `/space` for another app route. */
function navigateFromIncomingMessageToast(
  path: string,
  push: (href: string) => void,
): void {
  const { ui, minimizeVideoSession } = useRoomStore.getState();
  if (ui.sessionActive && !ui.isMinimized) {
    markRoomMinimized();
    minimizeVideoSession();
  }
  push(path);
}

/** Toast when a peer message arrives while the user is not viewing that thread. */
export function ChatIncomingMessageToastBridge() {
  const router = useRouter();
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
      const conv = conversationFromCache(qc, msg.conversationId);
      if (!shouldToastIncomingMessage(msg, currentUserId, activeRef.current, conv)) return;

      showIncomingMessageToast(msg, conv, (path) =>
        navigateFromIncomingMessageToast(path, (href) => router.push(href)),
      );
    };

    socket.on('chat:message:new', onNew);
    return () => {
      socket.off('chat:message:new', onNew);
    };
  }, [socket, currentUserId, qc, router]);

  return null;
}
