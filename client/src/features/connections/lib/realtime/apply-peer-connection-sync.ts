import { patchMatchPeerPreviewCache } from "@/features/matching/lib/peer-preview-cache";
import { peerConnectionSynced } from "@/features/connections/state/connection-realtime-sync-slice";
import type { PublicProfileConnectionState } from "@/features/user-profile/types/public-profile.types";
import type { AppDispatch } from "@/lib/redux/store";

export type PeerConnectionPatch = {
  connectionState: PublicProfileConnectionState;
  connectionId: string | null;
};

/** Single entry point: Redux live sync + match peer preview RTK cache. */
export function applyPeerConnectionSync(
  dispatch: AppDispatch,
  peerUserId: string,
  patch: PeerConnectionPatch,
): void {
  const id = peerUserId.trim();
  if (!id) return;

  dispatch(
    peerConnectionSynced({
      peerUserId: id,
      connectionState: patch.connectionState,
      connectionId: patch.connectionId,
    }),
  );
  patchMatchPeerPreviewCache(dispatch, id, patch);
}
