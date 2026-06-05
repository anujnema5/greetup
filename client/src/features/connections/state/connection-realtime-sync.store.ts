import { create } from 'zustand';

import type { PublicProfileConnectionState } from '@/features/user-profile/types/public-profile.types';

export type PeerConnectionSyncEntry = {
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
  revision: number;
};

type ConnectionRealtimeSyncStore = {
  byPeerUserId: Record<string, PeerConnectionSyncEntry>;
  syncPeerConnection: (payload: {
    peerUserId: string;
    connectionState: PublicProfileConnectionState;
    connectionId: string | null;
  }) => void;
};

export const useConnectionRealtimeSyncStore = create<ConnectionRealtimeSyncStore>((set) => ({
  byPeerUserId: {},
  syncPeerConnection: (payload) => {
    const peerUserId = payload.peerUserId.trim();
    if (!peerUserId) return;

    set((state) => {
      const prev = state.byPeerUserId[peerUserId];
      return {
        byPeerUserId: {
          ...state.byPeerUserId,
          [peerUserId]: {
            connectionState: payload.connectionState,
            connectionId: payload.connectionId,
            revision: (prev?.revision ?? 0) + 1,
          },
        },
      };
    });
  },
}));

export function selectPeerConnectionSync(peerUserId: string) {
  return (state: ConnectionRealtimeSyncStore) => state.byPeerUserId[peerUserId];
}
