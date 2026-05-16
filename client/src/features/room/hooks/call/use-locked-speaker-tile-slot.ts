"use client";

import { useEffect, useState } from "react";

/**
 * Remembers who last spoke for tile ordering. Stays on that person after silence until
 * someone else becomes the live speaker (rtc `dominantSpeaker` changes to another peer).
 */
export function useLockedSpeakerTileSlot(
  peerIdsInCall: string[],
  liveSpeakerPeerId: string | null | undefined,
): string | null {
  const [lockedSpeakerPeerId, setLockedSpeakerPeerId] = useState<string | null>(null);

  useEffect(() => {
    const live = liveSpeakerPeerId ?? null;
    if (!live) return;
    setLockedSpeakerPeerId((prev) => (prev === live ? prev : live));
  }, [liveSpeakerPeerId]);

  useEffect(() => {
    if (!lockedSpeakerPeerId) return;
    if (!peerIdsInCall.includes(lockedSpeakerPeerId)) {
      setLockedSpeakerPeerId(null);
    }
  }, [peerIdsInCall, lockedSpeakerPeerId]);

  return lockedSpeakerPeerId;
}
