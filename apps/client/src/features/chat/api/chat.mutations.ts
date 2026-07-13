'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { API_ENDPOINTS, apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

import { invalidateChatCaches } from '../lib/invalidate-chat-caches';
import type { Conversation } from '../types/chat.types';

const { CHAT } = API_ENDPOINTS;

export function useCreateConnectionConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (body: { targetUserId: string }) =>
      apiFetch<Conversation>(CHAT.CONVERSATIONS_CONNECTION, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

export function useSetPersistence() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      wantsPersistence,
    }: {
      conversationId: string;
      wantsPersistence: boolean;
    }) =>
      apiFetch<void>(CHAT.persistence(conversationId), {
        method: 'PATCH',
        body: JSON.stringify({ wantsPersistence }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.chat.conversations });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      apiFetch<{ ok: true }>(CHAT.conversation(conversationId), {
        method: 'DELETE',
      }),
    onMutate: async (conversationId) => {
      await qc.cancelQueries({ queryKey: queryKeys.chat.conversations });
      const previous = qc.getQueryData<Conversation[]>(queryKeys.chat.conversations);
      qc.setQueryData<Conversation[]>(queryKeys.chat.conversations, (list) =>
        list?.filter((c) => c.id !== conversationId),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.chat.conversations, ctx.previous);
      }
    },
    onSettled: (_result, _err, conversationId) => {
      invalidateChatCaches(qc, { conversationId });
    },
  });
}

export function useDeleteMessage() {
  return useMutation({
    mutationFn: ({
      messageId,
      deleteForAll = false,
    }: {
      messageId: string;
      deleteForAll?: boolean;
    }) =>
      apiFetch<void>(CHAT.deleteMessage(messageId), {
        method: 'DELETE',
        body: JSON.stringify({ deleteForAll }),
      }),
  });
}

export function usePinMessage() {
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch<void>(CHAT.pinMessage(messageId), { method: 'POST' }),
  });
}

export function useUnpinMessage() {
  return useMutation({
    mutationFn: (messageId: string) =>
      apiFetch<void>(CHAT.pinMessage(messageId), { method: 'DELETE' }),
  });
}

export function useReportMessage() {
  return useMutation({
    mutationFn: (body: { messageId: string; reason: string }) =>
      apiFetch<void>(CHAT.REPORT, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  });
}
