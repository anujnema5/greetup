import type {
  BindChatConversationSocket,
  ChatConversationLeaveTimer,
} from '../types/chat-conversation-socket.types';

/**
 * One `chat:room:join` per conversation per browser tab.
 * Leave is deferred on cleanup so React Strict Mode remounts don't churn the socket.
 */

const joinedInTab = new Set<string>();
const pendingLeaveTimers = new Map<string, ChatConversationLeaveTimer>();

const LEAVE_DEFER_MS = 100;

export const bindChatConversationSocket: BindChatConversationSocket = (
  socket,
  conversationId,
) => {
  const pendingLeave = pendingLeaveTimers.get(conversationId);
  if (pendingLeave) {
    clearTimeout(pendingLeave);
    pendingLeaveTimers.delete(conversationId);
  }

  const emitJoin = () => {
    socket.emit('chat:room:join', conversationId);
  };

  if (!joinedInTab.has(conversationId)) {
    if (socket.connected) emitJoin();
    joinedInTab.add(conversationId);
  }

  const onReconnect = () => {
    if (joinedInTab.has(conversationId)) emitJoin();
  };

  if (!socket.connected) {
    socket.once('connect', emitJoin);
  }
  socket.on('connect', onReconnect);

  return () => {
    socket.off('connect', onReconnect);
    const timer = setTimeout(() => {
      pendingLeaveTimers.delete(conversationId);
      if (joinedInTab.delete(conversationId)) {
        socket.emit('chat:room:leave', conversationId);
      }
    }, LEAVE_DEFER_MS);
    pendingLeaveTimers.set(conversationId, timer);
  };
};
