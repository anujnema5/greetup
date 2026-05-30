'use client';

import { useCallback, useRef } from 'react';
import { useSocket } from '@/lib/socket/provider';

const TYPING_DEBOUNCE_MS = 1500;

type UseTypingOptions = {
  /** When false, typing events are not emitted (e.g. messaging blocked). */
  enabled?: boolean;
};

export function useTyping(conversationId: string, options?: UseTypingOptions) {
  const { chatSocket: socket } = useSocket();
  const enabled = options?.enabled ?? true;
  const isTypingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (enabled) {
        socket.emit('chat:typing:stop', { conversationId });
      }
    }
  }, [socket, conversationId, enabled]);

  const onInputChange = useCallback(() => {
    if (!enabled) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('chat:typing:start', { conversationId });
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('chat:typing:stop', { conversationId });
    }, TYPING_DEBOUNCE_MS);
  }, [socket, conversationId, enabled, stopTyping]);

  return { onInputChange, stopTyping };
}
