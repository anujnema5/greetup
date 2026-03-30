import type { RootState } from "@/lib/redux/store";

export const selectCall = (state: RootState) => state.call;

export const selectIsCallActive = (state: RootState) => state.call.isActive;

export const selectIsCallMinimized = (state: RootState) => state.call.isMinimized;

export const selectActiveRoomId = (state: RootState) => state.call.activeRoomId;
