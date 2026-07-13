'use client';

import { useState } from 'react';
import type { Message } from '../types/chat.types';

export function useChatThreadUi(conversationId: string) {
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);

  if (activeConversationId !== conversationId) {
    setActiveConversationId(conversationId);
    setReplyTo(null);
    setEditingMessageId(null);
  }

  return {
    replyTo,
    setReplyTo,
    clearReply: () => setReplyTo(null),
    editingMessageId,
    setEditingMessageId,
  };
}
