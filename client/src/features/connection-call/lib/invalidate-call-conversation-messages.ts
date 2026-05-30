import type { AppDispatch } from '@/lib/redux/store';
import { chatApi } from '@/features/chat/api/chat-api';

/** Refetch thread after server persisted a call history system message. */
export function invalidateCallConversationMessages(
  dispatch: AppDispatch,
  conversationId: string | undefined,
): void {
  if (!conversationId) return;
  dispatch(
    chatApi.util.invalidateTags([{ type: 'Messages', id: conversationId }]),
  );
}
