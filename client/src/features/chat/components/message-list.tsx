'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CHAT_HORIZONTAL_PADDING } from '../constants';
import { useMessageListView } from '../hooks/use-message-list-view';
import { getMessageRowLayout } from '../lib/message-cluster';
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
  const {
    bottomRef,
    containerRef,
    handleScroll,
    revealedTimeMessageId,
    toggleRevealTime,
    clearRevealedTime,
  } = useMessageListView(messages.length, currentUserId, hasMore, onLoadMore);

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
        const next = i < messages.length - 1 ? messages[i + 1]! : null;
        const layout = getMessageRowLayout({
          msg,
          index: i,
          prev,
          next,
          messages,
          currentUserId,
          conversationType,
          editingMessageId,
        });

        return (
          <div key={msg.id} className={cn(layout.spacingClass, 'min-w-0')}>
            <MessageBubble
              message={msg}
              isOwn={layout.isOwn}
              currentUserId={currentUserId}
              replyToMessage={layout.replyToMessage}
              clusterPosition={layout.clusterPosition}
              showPeerHeader={layout.showPeerHeader}
              peerColumnGutter={layout.peerColumnGutter}
              showDirectPeerAvatar={layout.showDirectPeerAvatar}
              onToggleReaction={onToggleReaction}
              onReply={(message) => {
                clearRevealedTime();
                onReply(message);
              }}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onRetryFailed={onRetryFailed}
              editingMessageId={editingMessageId}
              onEditingChange={onEditingChange}
              revealedTimeMessageId={revealedTimeMessageId}
              onRevealTime={toggleRevealTime}
            />
          </div>
        );
      })}

      <TypingIndicator userIds={typingUserIds} />
      <div ref={bottomRef} />
    </div>
  );
}
