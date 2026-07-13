import { create } from 'zustand';

import type {
  RoomActiveActivity,
  RoomActivityStoreState,
  RoomChessLastOutcome,
} from '@/features/room/types/activity-state.types';

type RoomActivityStore = RoomActivityStoreState & {
  setActiveActivity: (activity: RoomActiveActivity | null) => void;
  setLastChessOutcome: (outcome: RoomChessLastOutcome) => void;
  clearLastChessOutcome: () => void;
  /** Clears activity when the `/space/[roomId]` route id changes. */
  onEnterRoomPage: (roomId: string) => void;
  /** Clears in-call activity when the video session ends or rematch search begins. */
  clearOnSessionChange: () => void;
  reset: () => void;
};

const initialState = (): RoomActivityStoreState => ({
  routeRoomId: null,
  active: null,
  lastChessOutcome: null,
});

export const useRoomActivityStore = create<RoomActivityStore>((set) => ({
  ...initialState(),

  setActiveActivity: (activity) => set({ active: activity }),

  setLastChessOutcome: (outcome) => set({ lastChessOutcome: outcome }),

  clearLastChessOutcome: () => set({ lastChessOutcome: null }),

  onEnterRoomPage: (roomId) =>
    set((state) => {
      if (state.routeRoomId === roomId) return state;
      return { ...state, routeRoomId: roomId, active: null, lastChessOutcome: null };
    }),

  clearOnSessionChange: () =>
    set((state) => ({ ...state, active: null, lastChessOutcome: null })),

  reset: () => set(initialState()),
}));

export function selectRoomActiveActivity(state: RoomActivityStore) {
  return state.active;
}

export function selectRoomLastChessOutcome(state: RoomActivityStore) {
  return state.lastChessOutcome;
}
