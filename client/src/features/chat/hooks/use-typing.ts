'use client';

import { useCallback, useRef } from 'react';
import { useSocket } from '@/lib/socket/provider';

const TYPING_DEBOUNCE_MS = 1500;

export function useTyping(conversationId: string) {
  const { chatSocket: socket } = useSocket();
  const isTypingRef = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onInputChange = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('chat:typing:start', { conversationId });
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('chat:typing:stop', { conversationId });
    }, TYPING_DEBOUNCE_MS);
  }, [socket, conversationId]);

  const stopTyping = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('chat:typing:stop', { conversationId });
    }
  }, [socket, conversationId]);

  return { onInputChange, stopTyping };
}
