"use client";

import { useMemo } from "react";
import { sortPeerIds } from "@/features/rtc/lib/remote-participant-streams";
import type { RemotePeer } from "@/features/rtc/types/mediasoup-room.types";
import { usePeerIdsWithSpeakerFirst } from "@/features/room/hooks/call/use-peer-ids-with-speaker-first";

/** Sorted peer ids for the People panel camera grid (live speaker stays on page 1 after silence). */
export function usePeoplePanelCameraOrder(
  remotePeers: Record<string, RemotePeer>,
  liveSpeakerPeerId: string | null | undefined,
  speakingMsByPeer: Record<string, number> | undefined,
) {
  const allPeerIds = useMemo(() => sortPeerIds(Object.keys(remotePeers)), [remotePeers]);
  const { peerIdsWithSpeakerFirst, lockedSpeakerPeerId } = usePeerIdsWithSpeakerFirst(
    allPeerIds,
    liveSpeakerPeerId,
    speakingMsByPeer,
  );
  return {
    allPeerIds,
    peerIdsWithSpeakerFirst,
    lockedSpeakerPeerId,
  };
}
