import { create } from 'zustand';

type ChatUiStore = {
  typingState: Record<string, Record<string, boolean>>;
  unreadCounts: Record<string, number>;
  activeConversationId: string | null;
  setTyping: (payload: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  }) => void;
  setUnreadCount: (payload: { conversationId: string; count: number }) => void;
  resetUnreadCount: (conversationId: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
};

export const useChatUiStore = create<ChatUiStore>((set) => ({
  typingState: {},
  unreadCounts: {},
  activeConversationId: null,

  setTyping: ({ conversationId, userId, isTyping }) =>
    set((state) => ({
      typingState: {
        ...state.typingState,
        [conversationId]: {
          ...state.typingState[conversationId],
          [userId]: isTyping,
        },
      },
    })),

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
