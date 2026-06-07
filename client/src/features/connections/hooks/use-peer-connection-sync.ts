"use client";

import {
  selectPeerConnectionSync,
  useConnectionRealtimeSyncStore,
} from "@/features/connections/state/connection-realtime-sync.store";

/** Live connection state for a peer (socket / notification driven). */
export function usePeerConnectionSync(peerUserId: string) {
  return useConnectionRealtimeSyncStore(selectPeerConnectionSync(peerUserId));
}
