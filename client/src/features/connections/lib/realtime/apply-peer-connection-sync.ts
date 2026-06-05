import { patchMatchPeerPreviewCache } from "@/features/matching/lib/peer-preview-cache";
import { useConnectionRealtimeSyncStore } from "@/features/connections/state/connection-realtime-sync.store";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";

export type PeerConnectionPatch = {
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
};

/** Single entry point: Zustand live sync + match peer preview React Query cache. */
export function applyPeerConnectionSync(
  peerUserId: string,
  patch: PeerConnectionPatch,
): void {
  const id = peerUserId.trim();
  if (!id) return;

  useConnectionRealtimeSyncStore.getState().syncPeerConnection({
    peerUserId: id,
    connectionState: patch.connectionState,
    connectionId: patch.connectionId,
  });
  patchMatchPeerPreviewCache(id, patch);
}
