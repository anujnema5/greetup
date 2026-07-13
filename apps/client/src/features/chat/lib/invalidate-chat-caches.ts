import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

export function invalidateChatCaches(
  qc: QueryClient,
  options?: { conversationId?: string; includeMessages?: boolean },
) {
  void qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
  if (options?.conversationId) {
    void qc.invalidateQueries({
      queryKey: queryKeys.chat.conversation(options.conversationId),
    });
    if (options.includeMessages !== false) {
      void qc.invalidateQueries({
        queryKey: queryKeys.chat.messages(options.conversationId),
      });
    }
  }
}

/** Refreshes inbox list and every open conversation detail (block state, previews). */
export function invalidateAllConversationsCache(qc: QueryClient = queryClient) {
  void qc.invalidateQueries({ queryKey: queryKeys.chat.all });
}

export function invalidateConversationCache(
  conversationId: string,
  qc: QueryClient = queryClient,
) {
  invalidateChatCaches(qc, { conversationId });
}
