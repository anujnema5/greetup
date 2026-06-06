import { create } from 'zustand';

type ConnectionCallStore = {
  missedByConversationId: Record<string, number>;
  markMissed: (conversationId: string) => void;
  clearMissed: (conversationId: string) => void;
};

export const useConnectionCallStore = create<ConnectionCallStore>((set) => ({
  missedByConversationId: {},
  markMissed: (conversationId) =>
    set((state) => ({
      missedByConversationId: {
        ...state.missedByConversationId,
        [conversationId]: (state.missedByConversationId[conversationId] ?? 0) + 1,
      },
    })),
  clearMissed: (conversationId) =>
    set((state) => {
      const next = { ...state.missedByConversationId };
      delete next[conversationId];
      return { missedByConversationId: next };
    }),
}));

export function selectMissedCallCount(conversationId: string) {
  return (state: ConnectionCallStore) => state.missedByConversationId[conversationId] ?? 0;
}
