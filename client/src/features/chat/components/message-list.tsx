'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MessageBubble } from './message-bubble';
import { TypingIndicator } from './typing-indicator';
import type { ConversationType, Message } from '../types/chat.types';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  conversationType?: ConversationType;
  typingUserIds: string[];
  hasMore: boolean;
  onLoadMore: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
}

export function MessageList({
  messages,
  currentUserId,
  conversationType,
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
      className="flex-1 overflow-y-auto px-5 py-3 md:px-5 md:py-4"
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

      {messages.map((msg, i) => {
        const prev = i > 0 ? messages[i - 1]! : null;
        const isOwn = msg.senderId === currentUserId;

        const clusterBreak =
          i === 0 ||
          !prev ||
          prev.messageType === 'system' ||
          msg.messageType === 'system' ||
          prev.senderId !== msg.senderId;

        const spacingClass = i === 0 ? '' : clusterBreak ? 'mt-3' : 'mt-0.5';

        const isGroup = conversationType === 'room_circle';
        const prevSamePeer =
          !!prev &&
          prev.messageType !== 'system' &&
          prev.senderId === msg.senderId;

        const showPeerHeader = !isOwn && isGroup && msg.messageType !== 'system' && !prevSamePeer;
        const peerColumnGutter = !isOwn && msg.messageType !== 'system' && prevSamePeer;
        const showDirectPeerAvatar =
          !isOwn && !isGroup && msg.messageType !== 'system' && !prevSamePeer;

        return (
          <div key={msg.id} className={cn(spacingClass, 'px-5 sm:px-0')}>
            <MessageBubble
              message={msg}
              isOwn={isOwn}
              showPeerHeader={showPeerHeader}
              peerColumnGutter={peerColumnGutter}
              showDirectPeerAvatar={showDirectPeerAvatar}
              onReact={onReact}
              onReply={onReply}
            />
          </div>
        );
      })}

      <TypingIndicator userIds={typingUserIds} />
      <div ref={bottomRef} />
    </div>
  );
}
