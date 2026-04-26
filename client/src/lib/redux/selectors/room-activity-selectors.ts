import type { RootState } from "@/lib/redux/store";

export const selectRoomActivityState = (state: RootState) => state.roomActivity;

export const selectRoomActiveActivity = (state: RootState) => state.roomActivity.active;

export const selectRoomLastChessOutcome = (state: RootState) => state.roomActivity.lastChessOutcome;
