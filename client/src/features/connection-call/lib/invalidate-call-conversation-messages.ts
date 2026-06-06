import type { QueryClient } from '@tanstack/react-query';

import { queryClient } from '@/lib/query/client';
import { queryKeys } from '@/lib/query/keys';

/** Refetch thread after server persisted a call history system message. */
export function invalidateCallConversationMessages(
  qc: QueryClient,
  conversationId: string | undefined,
): void {
  if (!conversationId) return;
  void qc.invalidateQueries({ queryKey: queryKeys.chat.messages(conversationId) });
}

/** Convenience for non-React call sites (socket handlers, etc.). */
export function invalidateCallConversationMessagesDefault(
  conversationId: string | undefined,
): void {
  invalidateCallConversationMessages(queryClient, conversationId);
}
