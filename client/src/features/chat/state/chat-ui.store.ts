import { create } from 'zustand';

/** Slightly longer than server Redis typing TTL (3s). */
export const TYPING_INDICATOR_TTL_MS = 3500;

type ChatUiStore = {
  typingState: Record<string, Record<string, boolean>>;
  unreadCounts: Record<string, number>;
  activeConversationId: string | null;
  setTyping: (payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
  clearTyping: (payload: { conversationId: string; userId: string }) => void;
  setUnreadCount: (payload: { conversationId: string; count: number }) => void;
  resetUnreadCount: (conversationId: string) => void;
  incrementUnreadCount: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
};

export const useChatUiStore = create<ChatUiStore>((set) => ({
  typingState: {},
  unreadCounts: {},
  activeConversationId: null,

  setTyping: ({ conversationId, userId, isTyping }) =>
    set((state) => {
      const conv = { ...(state.typingState[conversationId] ?? {}) };
      if (isTyping) {
        conv[userId] = true;
      } else {
        delete conv[userId];
      }
      return {
        typingState: {
          ...state.typingState,
          [conversationId]: conv,
        },
      };
    }),

  clearTyping: ({ conversationId, userId }) =>
    set((state) => {
      const conv = state.typingState[conversationId];
      if (!conv?.[userId]) return state;
      const next = { ...conv };
      delete next[userId];
      return {
        typingState: {
          ...state.typingState,
          [conversationId]: next,
        },
      };
    }),

  setUnreadCount: ({ conversationId, count }) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: count,
      },
    })),

  resetUnreadCount: (conversationId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: 0,
      },
    })),

  incrementUnreadCount: (conversationId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: (state.unreadCounts[conversationId] ?? 0) + 1,
      },
    })),

  setActiveConversation: (conversationId) =>
    set({ activeConversationId: conversationId }),
}));

export function selectTypingUsers(conversationId: string) {
  return (state: ChatUiStore) => state.typingState[conversationId];
}

export function selectUnreadCounts(state: ChatUiStore) {
  return state.unreadCounts;
}

export function selectActiveConversationId(state: ChatUiStore) {
  return state.activeConversationId;
}
