'use client';

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/redux/store';
import { useListConversationsQuery } from '../api/chat-api';

/** Total unread DMs/threads — merges live socket counts with the conversations list API. */
export function useTotalUnreadMessageCount(): number {
  const unreadByConversation = useSelector((s: RootState) => s.chat.unreadCounts);
  const { data: conversations = [] } = useListConversationsQuery(undefined, {
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

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
