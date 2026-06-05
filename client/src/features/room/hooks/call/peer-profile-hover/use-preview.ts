"use client";

import { useMemo } from "react";
import { useMatchPeerPreview } from "@/features/matching/api/matching.queries";
import { usePeerConnectionSync } from "@/features/connections/hooks/use-peer-connection-sync";
import {
  buildPeerProfileHoverDisplay,
  getPeerProfileConnectionPanel,
} from "@/features/room/lib/call/peer-profile-hover";
import type { PeerProfileHoverFallback } from "@/features/room/types/call/peer-profile-hover.types";

type UsePeerProfileHoverPreviewArgs = PeerProfileHoverFallback & {
  peerUserId: string;
  enabled: boolean;
};

/** Loads match peer preview + merges live connection sync for the hover card. */
export function usePeerProfileHoverPreview({
  peerUserId,
  enabled,
  displayName: fallbackDisplayName,
  imageUrl: fallbackImageUrl,
}: UsePeerProfileHoverPreviewArgs) {
  const { data: preview, isFetching } = useMatchPeerPreview(peerUserId, {
    enabled: enabled && Boolean(peerUserId),
  });
  const liveSync = usePeerConnectionSync(peerUserId);

  const display = useMemo(() => {
    const built = buildPeerProfileHoverDisplay(preview, {
      displayName: fallbackDisplayName,
      imageUrl: fallbackImageUrl,
    });
    if (!liveSync) return built;

    return {
      ...built,
      connectionState: liveSync.connectionState,
      connectionId: liveSync.connectionId,
      connectionPanel: getPeerProfileConnectionPanel(
        liveSync.connectionState,
        liveSync.connectionId,
      ),
    };
  }, [preview, fallbackDisplayName, fallbackImageUrl, liveSync]);

  return { display, isFetching };
}
