'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { useChat } from '../hooks/use-chat';
import { useConversation } from '../hooks/use-conversation';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import type { ConversationType, Message } from '../types/chat.types';

interface ChatPanelProps {
  conversationId: string;
  conversationType?: ConversationType;
}

export function ChatPanel({ conversationId, conversationType }: ChatPanelProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const userId = session?.user?.id ?? '';

  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const { messages, isLoading, hasMore, typingUsers, loadMore } = useConversation(conversationId);
  const { sendMessage, addReaction } = useChat(conversationId);

  const typingUserIds = Object.entries(typingUsers)
    .filter(([uid, isTyping]) => isTyping && uid !== userId)
    .map(([uid]) => uid);

  const handleSend = (content: string, replyToId?: string) => {
    sendMessage({ content, replyToId });
  };

  const handleReact = (messageId: string, emoji: string) => {
    addReaction(messageId, emoji);
  };

  if (isLoading || sessionPending) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-sm text-muted-foreground">
        Loading messages…
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 text-center text-sm text-muted-foreground">
        Sign in to read and send messages.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <MessageList
        messages={messages}
        currentUserId={userId}
        conversationType={conversationType}
        typingUserIds={typingUserIds}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onReact={handleReact}
        onReply={setReplyTo}
      />
      <MessageInput
        conversationId={conversationId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onSend={handleSend}
      />
    </div>
  );
}
