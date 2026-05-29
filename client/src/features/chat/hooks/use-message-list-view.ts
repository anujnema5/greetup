'use client';

import { useEffect, useRef, useState } from 'react';

export function useMessageListView(
  messagesLength: number,
  currentUserId: string,
  hasMore: boolean,
  onLoadMore: () => void,
) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);
  const [revealedTimeMessageId, setRevealedTimeMessageId] = useState<string | null>(null);
  const [syncKey, setSyncKey] = useState({ messagesLength, currentUserId });

  if (
    syncKey.messagesLength !== messagesLength ||
    syncKey.currentUserId !== currentUserId
  ) {
    setSyncKey({ messagesLength, currentUserId });
    setRevealedTimeMessageId(null);
  }

  useEffect(() => {
    if (messagesLength > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLenRef.current = messagesLength;
  }, [messagesLength]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop === 0 && hasMore) {
      onLoadMore();
    }
  };

  const toggleRevealTime = (messageId: string) => {
    setRevealedTimeMessageId((prev) => (prev === messageId ? null : messageId));
  };

  const clearRevealedTime = () => setRevealedTimeMessageId(null);

  return {
    bottomRef,
    containerRef,
    handleScroll,
    revealedTimeMessageId,
    toggleRevealTime,
    clearRevealedTime,
  };
}
