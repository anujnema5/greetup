'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { useChat } from '../hooks/use-chat';
import { useConversation } from '../hooks/use-conversation';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import type { ConversationType, Message } from '../types/chat.types';

interface ChatPanelProps {
  conversationId: string;
  conversationType?: ConversationType;
  showQuickReactions?: boolean;
  sendDisabled?: boolean;
}

const QUICK_REACTION_EMOJIS = ["👏", "🔥", "😂", "🎉", "❤️"];

export function ChatPanel({
  conversationId,
  conversationType,
  showQuickReactions = false,
  sendDisabled = false,
}: ChatPanelProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const sessionUserId = session?.user?.id ?? '';

  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const {
    messages,
    isLoading,
    hasMore,
    typingUsers,
    loadMore,
    currentUserId,
  } = useConversation(conversationId, { conversationType });

  const {
    sendMessage,
    retryFailedMessage,
    addReaction,
    removeReaction,
    editMessage,
    deleteMessage,
  } = useChat(conversationId, { sendEnabled: !sendDisabled });

  const typingUserIds = Object.entries(typingUsers)
    .filter(([uid, isTyping]) => isTyping && uid !== currentUserId)
    .map(([uid]) => uid);

  const handleSend = (content: string, replyToId?: string) => {
    if (sendDisabled) return;
    sendMessage({ content, replyToId });
  };

  const handleQuickReaction = (emoji: string) => {
    if (sendDisabled) return;
    sendMessage({ content: emoji });
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === messageId);
    const has = msg?.reactions?.some((r) => r.userId === currentUserId && r.emoji === emoji);
    if (has) removeReaction(messageId, emoji);
    else addReaction(messageId, emoji);
  };

  const handleEdit = (messageId: string, content: string) => {
    editMessage(messageId, content);
  };

  const handleDelete = (messageId: string, forAll: boolean) => {
    deleteMessage(messageId, forAll);
  };

  if (isLoading || sessionPending) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
        Loading messages…
      </div>
    );
  }

  if (!sessionUserId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Sign in to read and send messages.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {showQuickReactions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-b border-border/70 px-3 py-2 sm:px-4 md:px-5">
          {QUICK_REACTION_EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickReaction(emoji)}
              disabled={sendDisabled}
              className="h-auto px-2 py-0.5 text-sm"
              aria-label={`Send ${emoji} reaction`}
            >
              {emoji}
            </Button>
          ))}
        </div>
      ) : null}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        conversationType={conversationType}
        typingUserIds={typingUserIds}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onToggleReaction={handleToggleReaction}
        onReply={setReplyTo}
        onEditMessage={handleEdit}
        onDeleteMessage={handleDelete}
        onRetryFailed={retryFailedMessage}
      />
      <MessageInput
        conversationId={conversationId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
        disabled={sendDisabled}
      />
    </div>
  );
}
