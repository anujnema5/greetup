/**
 * Dominant mic tile: Tailwind ring + predicates for room video layouts.
 * Server emits `dominantSpeaker` (rtc-service). Motion: `.dominant-speaker-tile-highlight` in `app/globals.css`.
 */
export const DOMINANT_SPEAKER_TILE_RING =
  "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background dominant-speaker-tile-highlight";

export function isDominantSpeakerPeer(
  dominantSpeakerPeerId: string | null | undefined,
  peerId: string,
): boolean {
  return Boolean(dominantSpeakerPeerId && dominantSpeakerPeerId === peerId);
}

export function isDominantSpeakerLocalUser(
  dominantSpeakerPeerId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(currentUserId && dominantSpeakerPeerId === currentUserId);
}

/** Direct (1:1) layouts: highlight the remote tile when the dominant id is not the local user. */
export function isDirectCallRemoteSideDominant(
  isGroupRoom: boolean,
  dominantSpeakerPeerId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return (
    !isGroupRoom &&
    Boolean(dominantSpeakerPeerId) &&
    (!currentUserId || dominantSpeakerPeerId !== currentUserId)
  );
}
