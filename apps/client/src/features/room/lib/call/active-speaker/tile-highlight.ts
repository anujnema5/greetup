/**
 * Green ring on the camera tile for whoever is speaking (rtc-service `dominantSpeaker` event).
 * CSS: `.dominant-speaker-tile-highlight` in `app/globals.css`.
 */
export const LIVE_SPEAKER_TILE_RING =
  "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background dominant-speaker-tile-highlight";

export function isLiveSpeakerOnTile(
  liveSpeakerPeerId: string | null | undefined,
  peerId: string,
): boolean {
  return Boolean(liveSpeakerPeerId && liveSpeakerPeerId === peerId);
}

export function isYouTheLiveSpeaker(
  liveSpeakerPeerId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(currentUserId && liveSpeakerPeerId === currentUserId);
}

/** Direct (1:1): highlight the remote tile when someone else is the live speaker. */
export function isRemoteTileShowingLiveSpeaker(
  isCircleCall: boolean,
  liveSpeakerPeerId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return (
    !isCircleCall &&
    Boolean(liveSpeakerPeerId) &&
    (!currentUserId || liveSpeakerPeerId !== currentUserId)
  );
}
