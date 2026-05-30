import type { AppDispatch } from '@/lib/redux/store';
import { chatApi } from '../../api/chat-api';

/** Refreshes inbox list and every open conversation detail (block state, previews). */
export function invalidateAllConversationsCache(dispatch: AppDispatch): void {
  dispatch(chatApi.util.invalidateTags([{ type: 'Conversations' }]));
}

export function invalidateConversationCache(
  dispatch: AppDispatch,
  conversationId: string,
): void {
  dispatch(chatApi.util.invalidateTags([
    { type: 'Conversations', id: conversationId },
    { type: 'Conversations', id: 'LIST' },
  ]));
}
