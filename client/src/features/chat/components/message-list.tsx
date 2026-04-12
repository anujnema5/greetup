'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from './message-bubble';
import { TypingIndicator } from './typing-indicator';
import type { Message } from '../types/chat.types';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  typingUserIds: string[];
  hasMore: boolean;
  onLoadMore: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
}

export function MessageList({
  messages,
  currentUserId,
  typingUserIds,
  hasMore,
  onLoadMore,
  onReact,
  onReply,
}: MessageListProps) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLenRef   = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevLenRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    if (containerRef.current.scrollTop === 0 && hasMore) {
      onLoadMore();
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-0.5"
      onScroll={handleScroll}
    >
      {hasMore && (
        <button
          className="w-full text-xs text-muted-foreground py-2 hover:text-foreground cursor-pointer"
          onClick={onLoadMore}
        >
          Load older messages
        </button>
      )}

      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.senderId === currentUserId}
          onReact={onReact}
          onReply={onReply}
        />
      ))}

      <TypingIndicator userIds={typingUserIds} />
      <div ref={bottomRef} />
    </div>
  );
}
