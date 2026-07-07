'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import { usePeersOnlineStatus } from '@/features/presence';
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
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (message: Message) => void;
  onEditMessage?: (messageId: string, content: string) => void;
  onDeleteMessage?: (messageId: string, forAll: boolean) => void;
  onRetryFailed?: (message: Message) => void;
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
    handleScroll,
    revealedTimeMessageId,
    toggleRevealTime,
    clearRevealedTime,
  } = useMessageListView(messages.length, currentUserId, hasMore, onLoadMore);

  const senderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of messages) {
      if (m.senderId && m.senderId !== currentUserId) ids.add(m.senderId);
    }
    return [...ids];
  }, [messages, currentUserId]);

  const { isOnline } = usePeersOnlineStatus(senderIds);

  const typingPeerMessage = useMemo(() => {
    const typerId = typingUserIds.find(Boolean);
    if (!typerId) return null;

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]!;
      if (message.senderId === typerId && message.messageType !== 'system') {
        return message;
      }
    }
    return null;
  }, [messages, typingUserIds]);

  const primaryTypingUserId = typingUserIds.find(Boolean);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="min-h-0 min-w-0 flex-1">
          <MessageScrollerViewport onScroll={handleScroll} className={CHAT_HORIZONTAL_PADDING}>
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

            <MessageScrollerContent className="gap-0 pb-2 pt-3 md:pt-4">
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
                  <MessageScrollerItem
                    key={msg.id}
                    messageId={msg.id}
                    scrollAnchor={layout.isOwn}
                    className={cn(layout.spacingClass, 'min-w-0 max-w-full')}
                  >
                    <MessageBubble
                      message={msg}
                      isOwn={layout.isOwn}
                      currentUserId={currentUserId}
                      replyToMessage={layout.replyToMessage}
                      clusterPosition={layout.clusterPosition}
                      showPeerHeader={layout.showPeerHeader}
                      peerColumnGutter={layout.peerColumnGutter}
                      showDirectPeerAvatar={layout.showDirectPeerAvatar}
                      senderIsOnline={
                        msg.senderId && msg.senderId !== currentUserId
                          ? isOnline(msg.senderId)
                          : undefined
                      }
                      onToggleReaction={onToggleReaction}
                      onReply={
                        onReply
                          ? (message) => {
                              clearRevealedTime();
                              onReply(message);
                            }
                          : undefined
                      }
                      onEditMessage={onEditMessage}
                      onDeleteMessage={onDeleteMessage}
                      onRetryFailed={onRetryFailed}
                      editingMessageId={editingMessageId}
                      onEditingChange={onEditingChange}
                      revealedTimeMessageId={revealedTimeMessageId}
                      onRevealTime={toggleRevealTime}
                    />
                  </MessageScrollerItem>
                );
              })}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <TypingIndicator
        className={CHAT_HORIZONTAL_PADDING}
        userIds={typingUserIds}
        conversationType={conversationType}
        peerMessage={typingPeerMessage}
        senderIsOnline={
          primaryTypingUserId ? isOnline(primaryTypingUserId) : undefined
        }
      />
    </div>
  );
}
