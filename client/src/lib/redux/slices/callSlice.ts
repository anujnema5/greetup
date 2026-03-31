import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Global call / dock UI state (RTC session details can grow alongside this). */
export interface CallSliceState {
  isActive: boolean;
  isMinimized: boolean;
  /** Room id when the active call is tied to a specific room; null for legacy or unknown. */
  activeRoomId: string | null;
}

const initialState: CallSliceState = {
  isActive: false,
  isMinimized: false,
  activeRoomId: null,
};

export const callSlice = createSlice({
  name: "call",
  initialState,
  reducers: {
    startCall: (
      state,
      action: PayloadAction<{ roomId?: string | null } | undefined>,
    ) => {
      state.isActive = true;
      state.isMinimized = false;
      const payload = action.payload;
      state.activeRoomId =
        payload && "roomId" in payload ? payload.roomId ?? null : null;
    },
    endCall: (state) => {
      state.isActive = false;
      state.isMinimized = false;
      state.activeRoomId = null;
    },
    minimizeCall: (state) => {
      state.isMinimized = true;
    },
    expandCall: (state) => {
      state.isMinimized = false;
    },
  },
});

export const { startCall, endCall, minimizeCall, expandCall } = callSlice.actions;
export default callSlice.reducer;
