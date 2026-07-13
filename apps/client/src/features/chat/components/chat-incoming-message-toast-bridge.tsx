"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { markRoomMinimized } from "@/features/room/lib/session/room-sync";
import { useRoomStore } from "@/features/room/state/room.store";
import { useSession } from "@/lib/auth-client";
import { useSocket } from "@/lib/socket/provider";

import { conversationFromCache } from "../lib/conversation-from-cache";
import {
  shouldToastIncomingMessage,
  showIncomingMessageToast,
} from "../lib/incoming-message-toast";
import { messagesConversationPath } from "../lib/messages-routes";
import { useChatUiStore } from "../state/chat-ui.store";
import type { Message } from "../types/chat.types";

function isInCallForConversation(conversationId: string): boolean {
  const { ui, session } = useRoomStore.getState();
  return (
    ui.sessionActive &&
    !ui.isMinimized &&
    session.conversationId === conversationId
  );
}

function bumpUnread(conversationId: string, viewingConversationId: string | null): void {
  if (viewingConversationId === conversationId) return;
  useChatUiStore.getState().incrementUnreadCount(conversationId);
}

/** Minimize the call dock, then leave `/space` for another route (e.g. Messages). */
function leaveCallAndNavigate(path: string, push: (href: string) => void): void {
  const { ui, minimizeVideoSession } = useRoomStore.getState();
  if (ui.sessionActive && !ui.isMinimized) {
    markRoomMinimized();
    minimizeVideoSession();
  }
  push(path);
}

/**
 * Shows a toast when a peer message arrives and the thread is not open.
 * In-call room messages open the call chat UI; everything else goes to Messages.
 */
export function ChatIncomingMessageToastBridge() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { chatSocket: socket } = useSocket();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? "";

  const activeConversationId = useChatUiStore((s) => s.activeConversationId);
  const activeConversationIdRef = useRef(activeConversationId);

  useLayoutEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const onNewMessage = (msg: Message) => {
      const viewingId = activeConversationIdRef.current;
      const conversation = conversationFromCache(queryClient, msg.conversationId);

      if (!shouldToastIncomingMessage(msg, currentUserId, viewingId, conversation)) {
        return;
      }

      bumpUnread(msg.conversationId, viewingId);

      if (isInCallForConversation(msg.conversationId)) {
        showIncomingMessageToast(msg, () => {
          useRoomStore.getState().requestOpenInCallChat();
        });
        return;
      }

      const messagesPath = messagesConversationPath(
        msg.conversationId,
        conversation?.type ?? "connection",
      );
      showIncomingMessageToast(msg, () => {
        leaveCallAndNavigate(messagesPath, (href) => router.push(href));
      });
    };

    socket.on("chat:message:new", onNewMessage);
    return () => {
      socket.off("chat:message:new", onNewMessage);
    };
  }, [socket, currentUserId, queryClient, router]);

  return null;
}
