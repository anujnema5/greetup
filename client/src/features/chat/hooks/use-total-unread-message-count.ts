'use client';

import { useMemo } from 'react';
import { useListConversations } from '../api/chat.queries';
import { useChatUiStore } from '../state/chat-ui.store';

/** Total unread DMs/threads — merges live socket counts with the conversations list API. */
export function useTotalUnreadMessageCount(): number {
  const unreadByConversation = useChatUiStore((s) => s.unreadCounts);
  const { data: conversations = [] } = useListConversations();

  return useMemo(() => {
    const seen = new Set<string>();
    let total = 0;

    for (const conv of conversations) {
      seen.add(conv.id);
      total += unreadByConversation[conv.id] ?? conv.unreadCount ?? 0;
    }

    for (const [conversationId, count] of Object.entries(unreadByConversation)) {
      if (!seen.has(conversationId) && count > 0) {
        total += count;
      }
    }

    return total;
  }, [conversations, unreadByConversation]);
}
