import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';

import type { Conversation } from '../types/chat.types';

/** Resolve a conversation from React Query cache (list first, then detail). */
export function conversationFromCache(
  qc: QueryClient,
  conversationId: string,
): Conversation | undefined {
  const list = qc.getQueryData<Conversation[]>(queryKeys.chat.conversations);
  const fromList = list?.find((conv) => conv.id === conversationId);
  if (fromList) return fromList;

  return qc.getQueryData<Conversation>(queryKeys.chat.conversation(conversationId));
}
