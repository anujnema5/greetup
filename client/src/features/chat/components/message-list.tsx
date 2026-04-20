'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
  onToggleReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string, forAll: boolean) => void;
  onRetryFailed: (message: Message) => void;
}

export function MessageList({
  messages,
  currentUserId,
  conversationType,
  typingUserIds,
  hasMore,
  onLoadMore,
  onToggleReaction,
  onReply,
  onEditMessage,
  onDeleteMessage,
  onRetryFailed,
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
      className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 sm:px-4 md:px-5 md:py-4"
      onScroll={handleScroll}
    >
      {hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto w-full py-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onLoadMore()}
        >
          Load older messages
        </Button>
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
          <div key={msg.id} className={cn(spacingClass, 'min-w-0')}>
            <MessageBubble
              message={msg}
              isOwn={isOwn}
              currentUserId={currentUserId}
              showPeerHeader={showPeerHeader}
              peerColumnGutter={peerColumnGutter}
              showDirectPeerAvatar={showDirectPeerAvatar}
              onToggleReaction={onToggleReaction}
              onReply={onReply}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onRetryFailed={onRetryFailed}
            />
          </div>
        );
      })}

      <TypingIndicator userIds={typingUserIds} />
      <div ref={bottomRef} />
    </div>
  );
}
