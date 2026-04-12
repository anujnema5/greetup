import { API_ENDPOINTS, baseApi } from '@/lib/api';
import type { Conversation, Message, MessagesPage } from '../types/chat.types';

const { CHAT } = API_ENDPOINTS;

export const chatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listConversations: build.query<Conversation[], void>({
      query: () => CHAT.CONVERSATIONS,
      transformResponse: (res: { data: Conversation[] }) => res.data ?? [],
      providesTags: [{ type: 'Conversations', id: 'LIST' }],
    }),

    getConversation: build.query<Conversation, string>({
      query: (id) => CHAT.conversation(id),
      transformResponse: (res: { data: Conversation }) => res.data,
      providesTags: (_r, _e, id) => [{ type: 'Conversations', id }],
    }),

    getMessages: build.query<MessagesPage, { conversationId: string; cursor?: string }>({
      query: ({ conversationId, cursor }) =>
        cursor
          ? `${CHAT.messages(conversationId)}?cursor=${cursor}`
          : CHAT.messages(conversationId),
      transformResponse: (res: { data: MessagesPage }) => res.data,
      providesTags: (_r, _e, { conversationId }) => [{ type: 'Messages', id: conversationId }],

      // Merge pages — older messages prepended on scroll-up
      serializeQueryArgs: ({ queryArgs }) => queryArgs.conversationId,
      merge: (cache, incoming) => {
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
        url:    CHAT.CONVERSATIONS_CONNECTION,
        method: 'POST',
        body,
      }),
      transformResponse: (res: { data: Conversation }) => res.data,
      invalidatesTags: [{ type: 'Conversations', id: 'LIST' }],
    }),

    setPersistence: build.mutation<void, { conversationId: string; wantsPersistence: boolean }>({
      query: ({ conversationId, wantsPersistence }) => ({
        url:    CHAT.persistence(conversationId),
        method: 'PATCH',
        body:   { wantsPersistence },
      }),
      invalidatesTags: [{ type: 'Conversations', id: 'LIST' }],
    }),

    deleteMessage: build.mutation<void, { messageId: string; deleteForAll?: boolean }>({
      query: ({ messageId, deleteForAll = false }) => ({
        url:    CHAT.deleteMessage(messageId),
        method: 'DELETE',
        body:   { deleteForAll },
      }),
    }),

    pinMessage: build.mutation<void, string>({
      query: (messageId) => ({ url: CHAT.pinMessage(messageId), method: 'POST' }),
    }),

    unpinMessage: build.mutation<void, string>({
      query: (messageId) => ({ url: CHAT.pinMessage(messageId), method: 'DELETE' }),
    }),

    reportMessage: build.mutation<void, { messageId: string; reason: string }>({
      query: (body) => ({ url: CHAT.REPORT, method: 'POST', body }),
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
