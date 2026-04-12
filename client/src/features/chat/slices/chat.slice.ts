import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Message } from '../types/chat.types';

interface ChatState {
  // convId → { userId → bool }
  typingState: Record<string, Record<string, boolean>>;
  // convId → count
  unreadCounts: Record<string, number>;
  onlineUserIds: string[];
  // tempId → real messageId (cleared on ack)
  optimisticIds: Record<string, string>;
  // messages injected by socket (before RTK Query cache catches up)
  incomingMessages: Record<string, Message[]>;
  activeConversationId: string | null;
}

const initialState: ChatState = {
  typingState: {},
  unreadCounts: {},
  onlineUserIds: [],
  optimisticIds: {},
  incomingMessages: {},
  activeConversationId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    typingSet(state, action: PayloadAction<{
      conversationId: string;
      userId: string;
      isTyping: boolean;
    }>) {
      const { conversationId, userId, isTyping } = action.payload;
      state.typingState[conversationId] ??= {};
      state.typingState[conversationId][userId] = isTyping;
    },

    unreadCountSet(state, action: PayloadAction<{
      conversationId: string;
      count: number;
    }>) {
      state.unreadCounts[action.payload.conversationId] = action.payload.count;
    },

    unreadCountIncrement(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.unreadCounts[id] = (state.unreadCounts[id] ?? 0) + 1;
    },

    unreadCountReset(state, action: PayloadAction<string>) {
      state.unreadCounts[action.payload] = 0;
    },

    onlineUsersSet(state, action: PayloadAction<string[]>) {
      state.onlineUserIds = action.payload;
    },

    userOnline(state, action: PayloadAction<string>) {
      if (!state.onlineUserIds.includes(action.payload)) {
        state.onlineUserIds.push(action.payload);
      }
    },

    userOffline(state, action: PayloadAction<string>) {
      state.onlineUserIds = state.onlineUserIds.filter((id) => id !== action.payload);
    },

    optimisticIdRegistered(state, action: PayloadAction<{ tempId: string; realId: string }>) {
      state.optimisticIds[action.payload.tempId] = action.payload.realId;
    },

    optimisticIdCleared(state, action: PayloadAction<string>) {
      delete state.optimisticIds[action.payload];
    },

    messageReceived(state, action: PayloadAction<{
      conversationId: string;
      message: Message;
    }>) {
      const { conversationId, message } = action.payload;
      state.incomingMessages[conversationId] ??= [];

      // Avoid duplicates
      const exists = state.incomingMessages[conversationId].some((m) => m.id === message.id);
      if (!exists) {
        state.incomingMessages[conversationId].push(message);
      }
    },

    messageUpdated(state, action: PayloadAction<{
      conversationId: string;
      messageId: string;
      changes: Partial<Message>;
    }>) {
      const { conversationId, messageId, changes } = action.payload;
      const msgs = state.incomingMessages[conversationId];
      if (!msgs) return;
      const idx = msgs.findIndex((m) => m.id === messageId);
      if (idx !== -1) {
        msgs[idx] = { ...msgs[idx], ...changes };
      }
    },

    incomingMessagesCleared(state, action: PayloadAction<string>) {
      delete state.incomingMessages[action.payload];
    },

    activeConversationSet(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
    },
  },
});

export const {
  typingSet,
  unreadCountSet,
  unreadCountIncrement,
  unreadCountReset,
  onlineUsersSet,
  userOnline,
  userOffline,
  optimisticIdRegistered,
  optimisticIdCleared,
  messageReceived,
  messageUpdated,
  incomingMessagesCleared,
  activeConversationSet,
} = chatSlice.actions;

export default chatSlice.reducer;
