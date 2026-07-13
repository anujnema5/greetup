import type { Socket } from 'socket.io-client';

export type ChatConversationLeaveTimer = ReturnType<typeof setTimeout>;

export type ChatConversationSocketCleanup = () => void;

export type BindChatConversationSocket = (
  socket: Socket,
  conversationId: string,
) => ChatConversationSocketCleanup;
