"use client";

import { useMemo } from "react";
import type { RemoteParticipant } from "@/features/rtc";
import { orderRemotesForPaginatedTiles } from "@/features/room/lib/call/order-participants-for-pagination";
import { useStickyDominantAnchorPeerId } from "@/features/room/lib/call/use-sticky-dominant-anchor-peer-id";

export function usePaginatedRemoteOrder(
  remotes: RemoteParticipant[],
  dominantSpeakerPeerId: string | null | undefined,
  speakingMsByPeer: Record<string, number> | undefined,
) {
  const remotePeerIds = useMemo(() => remotes.map((r) => r.peer.peerId), [remotes]);
  const anchorPeerId = useStickyDominantAnchorPeerId(remotePeerIds, dominantSpeakerPeerId);
  const orderedRemotes = useMemo(
    () => orderRemotesForPaginatedTiles(remotes, anchorPeerId, speakingMsByPeer),
    [remotes, anchorPeerId, speakingMsByPeer],
  );
  return { orderedRemotes, anchorPeerId };
}
