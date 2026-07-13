"use client";

import { useMemo } from "react";
import type { RemoteParticipant } from "@/features/rtc";
import { sortParticipantsWithSpeakerFirst } from "@/features/room/lib/call/active-speaker";
import { useLockedSpeakerTileSlot } from "@/features/room/hooks/call/use-locked-speaker-tile-slot";

/** Participant list for a camera grid: last speaker first (after you), then by speaking time. */
export function useParticipantsWithSpeakerFirst(
  participants: RemoteParticipant[],
  liveSpeakerPeerId: string | null | undefined,
  speakingMsByPeer: Record<string, number> | undefined,
) {
  const peerIds = useMemo(() => participants.map((p) => p.peer.peerId), [participants]);
  const lockedSpeakerPeerId = useLockedSpeakerTileSlot(peerIds, liveSpeakerPeerId);
  const participantsWithSpeakerFirst = useMemo(
    () => sortParticipantsWithSpeakerFirst(participants, lockedSpeakerPeerId, speakingMsByPeer),
    [participants, lockedSpeakerPeerId, speakingMsByPeer],
  );
  return { participantsWithSpeakerFirst, lockedSpeakerPeerId };
}
