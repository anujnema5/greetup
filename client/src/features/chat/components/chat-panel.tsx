'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { useChat } from '../hooks/use-chat';
import { useConversation } from '../hooks/use-conversation';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import type { Message } from '../types/chat.types';

interface ChatPanelProps {
  conversationId: string;
}

export function ChatPanel({ conversationId }: ChatPanelProps) {
  const { data: session } = useSession();
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground text-sm">
        Loading messages…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        currentUserId={userId}
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
