"use client";

import { useEffect, useState } from "react";

/**
 * Keeps the last live dominant speaker as the pagination "anchor" after silence clears
 * `dominantSpeakerPeerId`. The anchor only changes when a different peer becomes dominant.
 */
export function useStickyDominantAnchorPeerId(
  remotePeerIds: string[],
  dominantSpeakerPeerId: string | null | undefined,
): string | null {
  const [anchorPeerId, setAnchorPeerId] = useState<string | null>(null);

  useEffect(() => {
    const live = dominantSpeakerPeerId ?? null;
    if (!live) return;
    setAnchorPeerId((prev) => (prev === live ? prev : live));
  }, [dominantSpeakerPeerId]);

  useEffect(() => {
    if (!anchorPeerId) return;
    if (!remotePeerIds.includes(anchorPeerId)) {
      setAnchorPeerId(null);
    }
  }, [remotePeerIds, anchorPeerId]);

  return anchorPeerId;
}
