import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  RoomActiveActivity,
  RoomActivitySliceState,
  RoomChessLastOutcome,
} from "@/lib/redux/types/activity-slice.types";
import {
  beginSearchingNextCall,
  endVideoSession,
  enterRoomPage,
  resetRoomState,
} from "@/lib/redux/slices/room-slice";

const initialState = (): RoomActivitySliceState => ({
  routeRoomId: null,
  active: null,
  lastChessOutcome: null,
});

export const roomActivitySlice = createSlice({
  name: "roomActivity",
  initialState: initialState(),
  reducers: {
    setActiveActivity: (state, action: PayloadAction<RoomActiveActivity | null>) => {
      state.active = action.payload;
    },
    setLastChessOutcome: (state, action: PayloadAction<RoomChessLastOutcome>) => {
      state.lastChessOutcome = action.payload;
    },
    clearLastChessOutcome: (state) => {
      state.lastChessOutcome = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(enterRoomPage, (state, action) => {
        const next = action.payload.roomId;
        if (state.routeRoomId === next) return;
        state.active = null;
        state.lastChessOutcome = null;
        state.routeRoomId = next;
      })
      .addCase(endVideoSession, (state) => {
        state.active = null;
        state.lastChessOutcome = null;
      })
      .addCase(beginSearchingNextCall, (state) => {
        state.active = null;
        state.lastChessOutcome = null;
      })
      .addCase(resetRoomState, () => initialState());
  },
});

export const { setActiveActivity, setLastChessOutcome, clearLastChessOutcome } = roomActivitySlice.actions;

export default roomActivitySlice.reducer;
