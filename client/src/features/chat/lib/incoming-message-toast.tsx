"use client";

import { toast } from "sonner";

import { IncomingMessageToastContent } from "../components/incoming-message-toast-content";
import { isMessagingBlocked } from "./messaging-block";
import { messagesConversationPath } from "./messages-routes";
import type { Conversation, Message } from "../types/chat.types";

export function shouldToastIncomingMessage(
  msg: Message,
  currentUserId: string,
  activeConversationId: string | null,
  conv: Conversation | undefined,
): boolean {
  if (!msg.senderId || msg.senderId === currentUserId) return false;
  if (msg.messageType === "system") return false;
  if (activeConversationId && msg.conversationId === activeConversationId) return false;
  if (isMessagingBlocked(conv?.messagingBlock)) return false;
  return true;
}

export function showIncomingMessageToast(
  msg: Message,
  conv: Conversation | undefined,
  navigate: (path: string) => void,
): void {
  const path = messagesConversationPath(msg.conversationId, conv?.type ?? "connection");

  toast.custom(
    (toastId) => (
      <IncomingMessageToastContent
        message={msg}
        toastId={toastId}
        onOpen={() => {
          toast.dismiss(toastId);
          navigate(path);
        }}
      />
    ),
    {
      id: msg.id,
      duration: 6_000,
      unstyled: true,
      classNames: {
        toast:
          "!m-0 !border-0 !bg-transparent !p-0 !shadow-none backdrop-blur-none",
      },
    },
  );
}
