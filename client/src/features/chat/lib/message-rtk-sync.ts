import type { AppDispatch, RootState } from '@/lib/redux/store';
import { chatApi } from '../api/chat-api';
import type {
  Message,
  MessageDeletedPayload,
  MessagesPage,
  Reaction,
  ReactionUpdatePayload,
} from '../types/chat.types';

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
        status:    'delivered',
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

const messagesArg = (conversationId: string) => ({ conversationId });

function getMessagesEntry(state: RootState, conversationId: string) {
  return chatApi.endpoints.getMessages.select(messagesArg(conversationId))(state);
}

export function pushOptimisticMessage(
  dispatch: AppDispatch,
  getState: () => RootState,
  conversationId: string,
  message: Message,
): void {
  const arg = messagesArg(conversationId);
  if (getMessagesEntry(getState(), conversationId).data) {
    dispatch(
      chatApi.util.updateQueryData('getMessages', arg, (draft) => {
        if (!draft.messages.some((m) => m.id === message.id)) {
          draft.messages.push(message);
        }
      }),
    );
  } else {
    dispatch(
      chatApi.util.upsertQueryData('getMessages', arg, {
        messages:   [message],
        nextCursor: null,
      }),
    );
  }
}

export function patchMessageInGetMessagesCache(
  dispatch: AppDispatch,
  conversationId: string,
  messageId: string,
  changes: Partial<Message>,
): void {
  dispatch(
    chatApi.util.updateQueryData('getMessages', { conversationId }, (draft) => {
      const i = draft.messages.findIndex((m) => m.id === messageId);
      if (i !== -1) Object.assign(draft.messages[i], changes);
    }),
  );
}

/** Keep `getMessages` aligned with socket events (thread may be closed). */
export function applySocketNewMessage(
  dispatch: AppDispatch,
  getState: () => RootState,
  msg: Message,
  currentUserId: string,
): void {
  if (!msg.conversationId) return;
  const { conversationId } = msg;
  const arg = messagesArg(conversationId);
  if (getMessagesEntry(getState(), conversationId).data) {
    dispatch(
      chatApi.util.updateQueryData('getMessages', arg, (draft) => {
        patchDraftNewMessage(draft, msg, currentUserId);
      }),
    );
  } else {
    dispatch(
      chatApi.util.upsertQueryData('getMessages', arg, {
        messages:   [{ ...msg, status: 'delivered' as const }],
        nextCursor: null,
      }),
    );
  }
}

export function applySocketEditedMessage(dispatch: AppDispatch, msg: Message): void {
  if (!msg.conversationId) return;
  dispatch(
    chatApi.util.updateQueryData('getMessages', messagesArg(msg.conversationId), (draft) => {
      patchDraftEditedMessage(draft, msg);
    }),
  );
}

export function applySocketDeletedMessage(dispatch: AppDispatch, payload: MessageDeletedPayload): void {
  dispatch(
    chatApi.util.updateQueryData('getMessages', messagesArg(payload.conversationId), (draft) => {
      patchDraftDeletedMessage(draft, payload);
    }),
  );
}

export function applySocketReactionUpdate(dispatch: AppDispatch, payload: ReactionUpdatePayload): void {
  dispatch(
    chatApi.util.updateQueryData('getMessages', messagesArg(payload.conversationId), (draft) => {
      patchDraftReactions(draft, payload);
    }),
  );
}
