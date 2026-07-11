'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth-client';
import { useSocket } from '@/lib/socket/provider';
import { markRoomMinimized } from '@/features/room/lib/session/room-sync';
import { useRoomStore } from '@/features/room/state/room.store';
import { conversationFromCache } from '../lib/conversation-from-cache';
import {
  incomingMessagePath,
  shouldToastIncomingMessage,
  showIncomingMessageToast,
} from '../lib/incoming-message-toast';
import { useChatUiStore } from '../state/chat-ui.store';
import type { Message } from '../types/chat.types';

/** Full-screen call (not minimized) whose room chat matches this conversation. */
function isActiveInCallConversation(conversationId: string): boolean {
  const { ui, session } = useRoomStore.getState();
  return (
    ui.sessionActive &&
    !ui.isMinimized &&
    Boolean(session.conversationId) &&
    session.conversationId === conversationId
  );
}

function bumpUnreadIfNeeded(conversationId: string, activeConversationId: string | null): void {
  if (activeConversationId === conversationId) return;
  useChatUiStore.getState().incrementUnreadCount(conversationId);
}

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

      bumpUnreadIfNeeded(msg.conversationId, activeRef.current);

      // In-call (1:1 or group): stay on the call and open chat panel/drawer.
      if (isActiveInCallConversation(msg.conversationId)) {
        showIncomingMessageToast(msg, conv, () => {
          useRoomStore.getState().requestOpenInCallChat();
        });
        return;
      }

      const path = incomingMessagePath(msg, conv);
      showIncomingMessageToast(msg, conv, () =>
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
