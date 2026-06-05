import type { RootState } from '@/lib/redux/store';
import { chatApi } from '../api/chat-api';
import type { Conversation } from '../types/chat.types';

/** Resolve a conversation from RTK Query cache (list first, then detail). */
export function conversationFromCache(
  getState: () => RootState,
  conversationId: string,
): Conversation | undefined {
  const list = chatApi.endpoints.listConversations.select()(getState())?.data;
  const fromList = list?.find((conv) => conv.id === conversationId);
  if (fromList) return fromList;

  return chatApi.endpoints.getConversation.select(conversationId)(getState())?.data;
}
