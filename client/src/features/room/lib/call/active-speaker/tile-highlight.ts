/**
 * Green ring on the camera tile for whoever is speaking (rtc-service `dominantSpeaker`).
 * CSS animation: `.dominant-speaker-tile-highlight` in `app/globals.css`.
 */
export const LIVE_SPEAKER_TILE_RING =
  "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background dominant-speaker-tile-highlight";

/** @deprecated Use `LIVE_SPEAKER_TILE_RING`. */
export const DOMINANT_SPEAKER_TILE_RING = LIVE_SPEAKER_TILE_RING;

export function isLiveSpeakerOnTile(
  dominantSpeakerPeerId: string | null | undefined,
  peerId: string,
): boolean {
  return Boolean(dominantSpeakerPeerId && dominantSpeakerPeerId === peerId);
}

/** @deprecated Use `isLiveSpeakerOnTile`. */
export const isDominantSpeakerPeer = isLiveSpeakerOnTile;

export function isYouTheLiveSpeaker(
  dominantSpeakerPeerId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return Boolean(currentUserId && dominantSpeakerPeerId === currentUserId);
}

/** @deprecated Use `isYouTheLiveSpeaker`. */
export const isDominantSpeakerLocalUser = isYouTheLiveSpeaker;

/** Direct (1:1): highlight the remote tile when someone else is the live speaker. */
export function isRemoteTileShowingLiveSpeaker(
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

/** @deprecated Use `isRemoteTileShowingLiveSpeaker`. */
export const isDirectCallRemoteSideDominant = isRemoteTileShowingLiveSpeaker;
