import type { Socket } from 'socket.io-client';

/**
 * One `chat:room:join` per conversation per browser tab.
 * Leave is deferred on cleanup so React Strict Mode remounts don't churn the socket.
 */

const joinedInTab = new Set<string>();
const pendingLeaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

const LEAVE_DEFER_MS = 100;

export function bindChatConversationSocket(
  socket: Socket,
  conversationId: string,
): () => void {
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
}
