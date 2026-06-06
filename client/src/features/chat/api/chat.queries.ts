'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import type { Conversation, MessagesPage } from '../types/chat.types';

const { CHAT } = API_ENDPOINTS;

function messagesPath(conversationId: string, cursor: string | undefined): string {
  const base = CHAT.messages(conversationId);
  if (!cursor) return base;
  return `${base}?cursor=${encodeURIComponent(cursor)}`;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const data = await apiFetch<Conversation[] | null | undefined>(CHAT.CONVERSATIONS);
  return data ?? [];
}

export async function fetchConversation(conversationId: string): Promise<Conversation> {
  return apiFetch<Conversation>(CHAT.conversation(conversationId));
}

export async function fetchMessagesPage(
  conversationId: string,
  cursor: string | undefined,
): Promise<MessagesPage> {
  return apiFetch<MessagesPage>(messagesPath(conversationId, cursor), {
    cache: 'no-store',
  });
}

export function useListConversations() {
  return useQuery({
    queryKey: queryKeys.chat.conversations,
    queryFn: fetchConversations,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useConversation(conversationId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.conversation(conversationId ?? ''),
    queryFn: () => fetchConversation(conversationId!),
    enabled: enabled && Boolean(conversationId),
  });
}

export function useMessages(conversationId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.chat.messages(conversationId),
    queryFn: ({ pageParam }) => fetchMessagesPage(conversationId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: enabled && Boolean(conversationId),
  });
}
