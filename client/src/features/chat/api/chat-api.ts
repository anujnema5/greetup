/**
 * Chat — RTK Query endpoints (conversations, messages, moderation).
 *
 * 1. Cache tags
 * 2. Response envelope helpers
 * 3. Endpoints: list → single conv → messages (paginated) → mutations
 */

import { API_ENDPOINTS, baseApi } from "@/lib/api";
import type { Conversation, Message, MessagesPage } from "../types/chat.types";

const { CHAT } = API_ENDPOINTS;

// ── Cache tags ────────────────────────────────────────────────────────────────

const CACHE_CONVERSATIONS_LIST = { type: "Conversations" as const, id: "LIST" as const };

function cacheTagForConversation(id: string) {
  return { type: "Conversations" as const, id };
}

function cacheTagForMessages(conversationId: string) {
  return { type: "Messages" as const, id: conversationId };
}

// ── Envelope → domain (server wraps payload in `data`) ─────────────────────────

function conversationListFromEnvelope(res: { data: Conversation[] }): Conversation[] {
  return res.data ?? [];
}

function conversationFromEnvelope(res: { data: Conversation }): Conversation {
  return res.data;
}

function messagesPageFromEnvelope(res: { data: MessagesPage }): MessagesPage {
  return res.data;
}

function messagesUrl(conversationId: string, cursor: string | undefined): string {
  const base = CHAT.messages(conversationId);
  if (!cursor) return base;
  return `${base}?cursor=${encodeURIComponent(cursor)}`;
}

// ── API slice ─────────────────────────────────────────────────────────────────

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listConversations: build.query<Conversation[], void>({
      query: () => CHAT.CONVERSATIONS,
      transformResponse: conversationListFromEnvelope,
      providesTags: [CACHE_CONVERSATIONS_LIST],
    }),

    getConversation: build.query<Conversation, string>({
      query: (id) => CHAT.conversation(id),
      transformResponse: conversationFromEnvelope,
      providesTags: (_result, _error, id) => [cacheTagForConversation(id)],
    }),

    getMessages: build.query<MessagesPage, { conversationId: string; cursor?: string }>({
      query: ({ conversationId, cursor }) => ({
        url: messagesUrl(conversationId, cursor),
        cache: "no-store",
      }),
      transformResponse: messagesPageFromEnvelope,
      providesTags: (_result, _error, { conversationId }) => [cacheTagForMessages(conversationId)],

      serializeQueryArgs: ({ queryArgs }) => queryArgs.conversationId,

      merge: (cache, incoming, { arg }) => {
        if (!arg.cursor || !cache) {
          return incoming;
        }
        const existingIds = new Set(cache.messages.map((m) => m.id));
        const newMsgs = incoming.messages.filter((m) => !existingIds.has(m.id));
        cache.messages.unshift(...newMsgs);
        cache.nextCursor = incoming.nextCursor;
      },

      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.cursor !== previousArg?.cursor,
    }),

    createConnectionConversation: build.mutation<Conversation, { targetUserId: string }>({
      query: (body) => ({
        url: CHAT.CONVERSATIONS_CONNECTION,
        method: "POST",
        body,
      }),
      transformResponse: conversationFromEnvelope,
      invalidatesTags: [CACHE_CONVERSATIONS_LIST],
    }),

    setPersistence: build.mutation<void, { conversationId: string; wantsPersistence: boolean }>({
      query: ({ conversationId, wantsPersistence }) => ({
        url: CHAT.persistence(conversationId),
        method: "PATCH",
        body: { wantsPersistence },
      }),
      invalidatesTags: [CACHE_CONVERSATIONS_LIST],
    }),

    deleteMessage: build.mutation<void, { messageId: string; deleteForAll?: boolean }>({
      query: ({ messageId, deleteForAll = false }) => ({
        url: CHAT.deleteMessage(messageId),
        method: "DELETE",
        body: { deleteForAll },
      }),
    }),

    pinMessage: build.mutation<void, string>({
      query: (messageId) => ({
        url: CHAT.pinMessage(messageId),
        method: "POST",
      }),
    }),

    unpinMessage: build.mutation<void, string>({
      query: (messageId) => ({
        url: CHAT.pinMessage(messageId),
        method: "DELETE",
      }),
    }),

    reportMessage: build.mutation<void, { messageId: string; reason: string }>({
      query: (body) => ({
        url: CHAT.REPORT,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useListConversationsQuery,
  useGetConversationQuery,
  useGetMessagesQuery,
  useCreateConnectionConversationMutation,
  useSetPersistenceMutation,
  useDeleteMessageMutation,
  usePinMessageMutation,
  useUnpinMessageMutation,
  useReportMessageMutation,
} = chatApi;
