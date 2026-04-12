import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  typingState: Record<string, Record<string, boolean>>;
  unreadCounts: Record<string, number>;
  activeConversationId: string | null;
}

const initialState: ChatState = {
  typingState:      {},
  unreadCounts:     {},
  activeConversationId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    typingSet(
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        isTyping: boolean;
      }>,
    ) {
      const { conversationId, userId, isTyping } = action.payload;
      state.typingState[conversationId] ??= {};
      state.typingState[conversationId][userId] = isTyping;
    },

    unreadCountSet(
      state,
      action: PayloadAction<{ conversationId: string; count: number }>,
    ) {
      state.unreadCounts[action.payload.conversationId] = action.payload.count;
    },

    unreadCountReset(state, action: PayloadAction<string>) {
      state.unreadCounts[action.payload] = 0;
    },

    activeConversationSet(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
    },
  },
});

export const {
  typingSet,
  unreadCountSet,
  unreadCountReset,
  activeConversationSet,
} = chatSlice.actions;

export default chatSlice.reducer;
