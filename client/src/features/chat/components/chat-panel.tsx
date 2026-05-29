'use client';

import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useChat } from '../hooks/use-chat';
import { useChatThreadUi } from '../hooks/use-chat-thread-ui';
import { useConversation } from '../hooks/use-conversation';
import { CHAT_HORIZONTAL_PADDING } from '../constants';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import type { ConversationType } from '../types/chat.types';

interface ChatPanelProps {
  conversationId: string;
  conversationType?: ConversationType;
  showQuickReactions?: boolean;
  sendDisabled?: boolean;
}

const QUICK_REACTION_EMOJIS = ['👏', '🔥', '😂', '🎉', '❤️'];

export function ChatPanel({
  conversationId,
  conversationType,
  showQuickReactions = false,
  sendDisabled = false,
}: ChatPanelProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const sessionUserId = session?.user?.id ?? '';

  const {
    replyTo,
    setReplyTo,
    clearReply,
    editingMessageId,
    setEditingMessageId,
  } = useChatThreadUi(conversationId);

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
        <div className={cn('flex min-w-0 flex-wrap items-center gap-1.5 border-b border-border/70 py-2', CHAT_HORIZONTAL_PADDING)}>
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
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        onRetryFailed={retryFailedMessage}
        editingMessageId={editingMessageId}
        onEditingChange={setEditingMessageId}
      />
      <MessageInput
        conversationId={conversationId}
        currentUserId={currentUserId}
        replyTo={replyTo}
        onCancelReply={clearReply}
        onSend={handleSend}
        disabled={sendDisabled || !!editingMessageId}
      />
    </div>
  );
}
