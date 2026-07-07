'use client';

import { useState, type UIEvent } from 'react';

export function useMessageListView(
  messagesLength: number,
  currentUserId: string,
  hasMore: boolean,
  onLoadMore: () => void,
) {
  const [revealedTimeMessageId, setRevealedTimeMessageId] = useState<string | null>(null);
  const [syncKey, setSyncKey] = useState({ messagesLength, currentUserId });

  if (
    syncKey.messagesLength !== messagesLength ||
    syncKey.currentUserId !== currentUserId
  ) {
    setSyncKey({ messagesLength, currentUserId });
    setRevealedTimeMessageId(null);
  }

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    if (hasMore && e.currentTarget.scrollTop <= 0) {
      onLoadMore();
    }
  };

  const toggleRevealTime = (messageId: string) => {
    setRevealedTimeMessageId((prev) => (prev === messageId ? null : messageId));
  };

  const clearRevealedTime = () => setRevealedTimeMessageId(null);

  return {
    handleScroll,
    revealedTimeMessageId,
    toggleRevealTime,
    clearRevealedTime,
  };
}
