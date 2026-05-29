'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CHAT_HORIZONTAL_PADDING } from '../constants';
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
  editingMessageId?: string | null;
  onEditingChange?: (messageId: string | null) => void;
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
  editingMessageId = null,
  onEditingChange,
}: MessageListProps) {
  const bottomRef    = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLenRef   = useRef(0);
  const [revealedTimeMessageId, setRevealedTimeMessageId] = useState<string | null>(null);

  useEffect(() => {
    setRevealedTimeMessageId(null);
  }, [messages.length, currentUserId]);

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
      className={cn(
        'min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-2 pt-3 md:pt-4',
        CHAT_HORIZONTAL_PADDING,
      )}
      onScroll={handleScroll}
    >
      {hasMore && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto w-full cursor-pointer py-2 text-xs text-muted-foreground hover:text-foreground"
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

        const next = i < messages.length - 1 ? messages[i + 1]! : null;
        const nextSamePeer =
          !!next &&
          next.messageType !== 'system' &&
          next.senderId === msg.senderId;

        const isReply = !!msg.replyToId && msg.messageType !== 'system';
        const replyToMessage = isReply
          ? messages.find((m) => m.id === msg.replyToId) ?? null
          : null;

        let clusterPosition: 'single' | 'first' | 'middle' | 'last' = 'single';
        if (msg.messageType !== 'system') {
          if (isReply) {
            clusterPosition = 'single';
          } else if (clusterBreak && !nextSamePeer) clusterPosition = 'single';
          else if (clusterBreak && nextSamePeer) clusterPosition = 'first';
          else if (!clusterBreak && nextSamePeer) clusterPosition = 'middle';
          else clusterPosition = 'last';
        }

        const prevIsEditing = !!prev && editingMessageId === prev.id;
        const thisIsEditing = editingMessageId === msg.id;

        const spacingClass =
          i === 0
            ? ''
            : thisIsEditing || prevIsEditing || isReply
              ? 'mt-4'
              : editingMessageId
                ? 'mt-3'
                : clusterBreak
                  ? 'mt-4'
                  : 'mt-2';

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
              replyToMessage={replyToMessage}
              clusterPosition={clusterPosition}
              showPeerHeader={showPeerHeader}
              peerColumnGutter={peerColumnGutter}
              showDirectPeerAvatar={showDirectPeerAvatar}
              onToggleReaction={onToggleReaction}
              onReply={(msg) => {
                setRevealedTimeMessageId(null);
                onReply(msg);
              }}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onRetryFailed={onRetryFailed}
              editingMessageId={editingMessageId}
              onEditingChange={onEditingChange}
              revealedTimeMessageId={revealedTimeMessageId}
              onRevealTime={(id) =>
                setRevealedTimeMessageId((prev) => (prev === id ? null : id))
              }
            />
          </div>
        );
      })}

      <TypingIndicator userIds={typingUserIds} />
      <div ref={bottomRef} />
    </div>
  );
}
