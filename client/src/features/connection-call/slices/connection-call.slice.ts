import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type ConnectionCallUiState = {
  /** Unread missed-call markers per conversation (cleared when thread is opened). */
  missedByConversationId: Record<string, number>;
};

const initialState: ConnectionCallUiState = {
  missedByConversationId: {},
};

const connectionCallSlice = createSlice({
  name: 'connectionCall',
  initialState,
  reducers: {
    missedConnectionCallMarked(state, action: PayloadAction<{ conversationId: string }>) {
      const id = action.payload.conversationId;
      state.missedByConversationId[id] = (state.missedByConversationId[id] ?? 0) + 1;
    },
    missedConnectionCallCleared(state, action: PayloadAction<string>) {
      delete state.missedByConversationId[action.payload];
    },
  },
});

export const { missedConnectionCallMarked, missedConnectionCallCleared } = connectionCallSlice.actions;
export default connectionCallSlice.reducer;

export function selectMissedCallCount(state: { connectionCall: ConnectionCallUiState }, conversationId: string) {
  return state.connectionCall.missedByConversationId[conversationId] ?? 0;
}
