import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";
import type { RootState } from "@/lib/redux/store";

export type PeerConnectionSyncEntry = {
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
  revision: number;
};

type ConnectionRealtimeSyncState = {
  byPeerUserId: Record<string, PeerConnectionSyncEntry>;
};

const initialState: ConnectionRealtimeSyncState = {
  byPeerUserId: {},
};

const connectionRealtimeSyncSlice = createSlice({
  name: "connectionRealtimeSync",
  initialState,
  reducers: {
    peerConnectionSynced(
      state,
      action: PayloadAction<{
        peerUserId: string;
        connectionState: PublicProfileConnectionState;
        connectionId: string | null;
      }>,
    ) {
      const peerUserId = action.payload.peerUserId.trim();
      if (!peerUserId) return;

      const prev = state.byPeerUserId[peerUserId];
      state.byPeerUserId[peerUserId] = {
        connectionState: action.payload.connectionState,
        connectionId: action.payload.connectionId,
        revision: (prev?.revision ?? 0) + 1,
      };
    },
  },
});

export const { peerConnectionSynced } = connectionRealtimeSyncSlice.actions;
export default connectionRealtimeSyncSlice.reducer;

export function selectPeerConnectionSync(peerUserId: string) {
  return (state: RootState) => state.connectionRealtimeSync.byPeerUserId[peerUserId];
}
