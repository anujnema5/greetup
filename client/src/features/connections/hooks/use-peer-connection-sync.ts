"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectPeerConnectionSync } from "@/features/connections/state/connection-realtime-sync-slice";

/** Live connection state for a peer (socket / notification driven). */
export function usePeerConnectionSync(peerUserId: string) {
  return useAppSelector(selectPeerConnectionSync(peerUserId));
}
