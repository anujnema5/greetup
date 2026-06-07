import type { QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';

import type { Conversation } from '../types/chat.types';

export type InboxActivityPatch = {
  lastActivityAt?: string;
  lastMessagePreview?: string | null;
};

export function applyConversationActivityToInbox(
  qc: QueryClient,
  conversationId: string,
  patch: InboxActivityPatch,
): boolean {
  let hit = false;
  qc.setQueryData<Conversation[]>(queryKeys.chat.conversations, (draft) => {
    if (!draft) return draft;
    const i = draft.findIndex((c) => c.id === conversationId);
    if (i === -1) return draft;
    hit = true;
    const next = [...draft];
    const row = { ...next[i] };
    if (patch.lastActivityAt) {
      row.updatedAt = patch.lastActivityAt;
    }
    if ('lastMessagePreview' in patch) {
      row.lastMessagePreview = patch.lastMessagePreview ?? null;
    }
    next[i] = row;
    next.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return next;
  });
  return hit;
}
