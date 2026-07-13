"use client";

import { useMemo } from "react";
import { sortPeerIdsWithSpeakerFirst } from "@/features/room/lib/call/active-speaker";
import { useLockedSpeakerTileSlot } from "@/features/room/hooks/call/use-locked-speaker-tile-slot";

/** Peer id list for People panel tiles: last speaker first, then by speaking time. */
export function usePeerIdsWithSpeakerFirst(
  peerIds: string[],
  liveSpeakerPeerId: string | null | undefined,
  speakingMsByPeer: Record<string, number> | undefined,
) {
  const lockedSpeakerPeerId = useLockedSpeakerTileSlot(peerIds, liveSpeakerPeerId);
  const peerIdsWithSpeakerFirst = useMemo(
    () => sortPeerIdsWithSpeakerFirst(peerIds, lockedSpeakerPeerId, speakingMsByPeer),
    [peerIds, lockedSpeakerPeerId, speakingMsByPeer],
  );
  return { peerIdsWithSpeakerFirst, lockedSpeakerPeerId };
}
