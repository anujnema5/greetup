'use client';

import { useCallback, useEffect, useRef } from 'react';
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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (enabled) {
        socket.emit('chat:typing:stop', { conversationId });
      }
    }
  }, [socket, conversationId, enabled]);

  const onInputChange = useCallback(
    (hasContent: boolean) => {
      if (!enabled || !hasContent) {
        stopTyping();
        return;
      }

      if (!isTypingRef.current) {
        isTypingRef.current = true;
      }
      socket.emit('chat:typing:start', { conversationId });

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        isTypingRef.current = false;
        socket.emit('chat:typing:stop', { conversationId });
      }, TYPING_DEBOUNCE_MS);
    },
    [socket, conversationId, enabled, stopTyping],
  );

  useEffect(() => {
    if (!enabled) stopTyping();
  }, [enabled, stopTyping]);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  return { onInputChange, stopTyping };
}
