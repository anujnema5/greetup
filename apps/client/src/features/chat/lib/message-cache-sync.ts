import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query/keys';

import type {
  Message,
  MessageDeletedPayload,
  MessagesPage,
  Reaction,
  ReactionUpdatePayload,
} from '../types/chat.types';

type MessagesCache = InfiniteData<MessagesPage>;

function normalizeReactions(raw: Reaction[]): Reaction[] {
  return raw.map((r) => ({
    ...r,
    createdAt:
      typeof r.createdAt === 'string'
        ? r.createdAt
        : (r.createdAt as unknown as Date)?.toISOString?.() ?? String(r.createdAt),
  }));
}

export function patchDraftNewMessage(
  draft: MessagesPage,
  msg: Message,
  currentUserId: string,
): void {
  if (currentUserId && msg.senderId === currentUserId) {
    const tempIdx = draft.messages.findIndex(
      (m) =>
        m.id.startsWith('temp_') &&
        m.status === 'sending' &&
        m.content === msg.content,
    );
    if (tempIdx !== -1) {
      draft.messages[tempIdx] = {
        ...msg,
        reactions: msg.reactions ?? draft.messages[tempIdx]?.reactions ?? [],
        status: 'delivered',
      };
      return;
    }
  }
  if (!draft.messages.some((m) => m.id === msg.id)) {
    draft.messages.push({ ...msg, status: 'delivered' });
  }
}

export function patchDraftEditedMessage(draft: MessagesPage, msg: Message): void {
  const idx = draft.messages.findIndex((m) => m.id === msg.id);
  if (idx === -1) return;
  const prevRx = draft.messages[idx].reactions;
  Object.assign(draft.messages[idx], msg);
  if (!msg.reactions?.length && prevRx?.length) {
    draft.messages[idx].reactions = prevRx;
  }
}

export function patchDraftDeletedMessage(draft: MessagesPage, payload: MessageDeletedPayload): void {
  const idx = draft.messages.findIndex((m) => m.id === payload.messageId);
  if (idx === -1) return;
  draft.messages[idx].isDeleted = true;
  draft.messages[idx].deletedForAll = payload.deletedForAll;
  draft.messages[idx].content = '';
}

export function patchDraftReactions(draft: MessagesPage, payload: ReactionUpdatePayload): void {
  const idx = draft.messages.findIndex((m) => m.id === payload.messageId);
  if (idx !== -1) {
    draft.messages[idx].reactions = normalizeReactions(payload.reactions);
  }
}

function messagesKey(conversationId: string) {
  return queryKeys.chat.messages(conversationId);
}

function patchFirstPage(
  data: MessagesCache,
  patcher: (page: MessagesPage) => void,
): MessagesCache {
  if (!data.pages.length) return data;
  const pages = data.pages.map((page, index) => {
    if (index !== 0) return page;
    const next = { ...page, messages: [...page.messages] };
    patcher(next);
    return next;
  });
  return { ...data, pages };
}

function patchAllPages(
  data: MessagesCache,
  patcher: (page: MessagesPage) => void,
): MessagesCache {
  return {
    ...data,
    pages: data.pages.map((page) => {
      const next = { ...page, messages: [...page.messages] };
      patcher(next);
      return next;
    }),
  };
}

function mutateMessagesCache(
  qc: QueryClient,
  conversationId: string,
  mutator: (data: MessagesCache) => MessagesCache,
  options?: { createIfMissing?: boolean; seed?: MessagesPage },
): void {
  const key = messagesKey(conversationId);
  const existing = qc.getQueryData<MessagesCache>(key);
  if (!existing) {
    if (!options?.createIfMissing) return;
    const initial: MessagesCache = {
      pages: [options.seed ?? { messages: [], nextCursor: null }],
      pageParams: [undefined],
    };
    qc.setQueryData(key, mutator(initial));
    return;
  }
  qc.setQueryData(key, mutator(existing));
}

export function hasMessagesCache(qc: QueryClient, conversationId: string): boolean {
  return qc.getQueryData<MessagesCache>(messagesKey(conversationId)) != null;
}

export function pushOptimisticMessage(
  qc: QueryClient,
  conversationId: string,
  message: Message,
): void {
  mutateMessagesCache(
    qc,
    conversationId,
    (data) =>
      patchFirstPage(data, (draft) => {
        if (!draft.messages.some((m) => m.id === message.id)) {
          draft.messages.push(message);
        }
      }),
    {
      createIfMissing: true,
      seed: { messages: [message], nextCursor: null },
    },
  );
}

export function patchMessageInCache(
  qc: QueryClient,
  conversationId: string,
  messageId: string,
  changes: Partial<Message>,
): void {
  mutateMessagesCache(qc, conversationId, (data) =>
    patchAllPages(data, (draft) => {
      const i = draft.messages.findIndex((m) => m.id === messageId);
      if (i !== -1) Object.assign(draft.messages[i], changes);
    }),
  );
}

export function removeMessageFromCache(
  qc: QueryClient,
  conversationId: string,
  messageId: string,
): void {
  mutateMessagesCache(qc, conversationId, (data) =>
    patchAllPages(data, (draft) => {
      draft.messages = draft.messages.filter((m) => m.id !== messageId);
    }),
  );
}

export function markOwnMessagesReadInCache(
  qc: QueryClient,
  conversationId: string,
  currentUserId: string,
): void {
  mutateMessagesCache(qc, conversationId, (data) =>
    patchAllPages(data, (draft) => {
      for (const m of draft.messages) {
        if (m.senderId === currentUserId && m.status !== 'failed' && !m.isDeleted) {
          m.status = 'read';
        }
      }
    }),
  );
}

/** Keep message cache aligned with socket events (thread may be closed). */
export function applySocketNewMessage(
  qc: QueryClient,
  msg: Message,
  currentUserId: string,
): void {
  if (!msg.conversationId) return;
  const { conversationId } = msg;

  mutateMessagesCache(
    qc,
    conversationId,
    (data) =>
      patchFirstPage(data, (draft) => {
        patchDraftNewMessage(draft, msg, currentUserId);
      }),
    {
      createIfMissing: true,
      seed: {
        messages: [{ ...msg, status: 'delivered' as const }],
        nextCursor: null,
      },
    },
  );
}

export function applySocketEditedMessage(qc: QueryClient, msg: Message): void {
  if (!msg.conversationId) return;
  mutateMessagesCache(qc, msg.conversationId, (data) =>
    patchAllPages(data, (draft) => {
      patchDraftEditedMessage(draft, msg);
    }),
  );
}

export function applySocketDeletedMessage(
  qc: QueryClient,
  payload: MessageDeletedPayload,
): void {
  mutateMessagesCache(qc, payload.conversationId, (data) =>
    patchAllPages(data, (draft) => {
      patchDraftDeletedMessage(draft, payload);
    }),
  );
}

export function applySocketReactionUpdate(
  qc: QueryClient,
  payload: ReactionUpdatePayload,
): void {
  mutateMessagesCache(qc, payload.conversationId, (data) =>
    patchAllPages(data, (draft) => {
      patchDraftReactions(draft, payload);
    }),
  );
}
