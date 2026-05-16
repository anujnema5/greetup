/**
 * Tracks last non-null live speaker for the minimized dock.
 * Server clears `dominantSpeaker` on silence — we still keep that peer on the main tile until
 * someone else becomes the live speaker (avoids snapping back to `remoteParticipants[0]` sort order).
 */

export type MinimizedDockSilenceState = {
  lastLiveSpeakerPeerId: string | null;
};

export const initialMinimizedDockSilenceState: MinimizedDockSilenceState = {
  lastLiveSpeakerPeerId: null,
};

export type MinimizedDockSilenceAction = { type: "apply_live_speaker"; peerId: string | null };

export function minimizedDockSilenceReducer(
  s: MinimizedDockSilenceState,
  a: MinimizedDockSilenceAction,
): MinimizedDockSilenceState {
  switch (a.type) {
    case "apply_live_speaker":
      if (a.peerId !== null) {
        if (s.lastLiveSpeakerPeerId === a.peerId) return s;
        return { lastLiveSpeakerPeerId: a.peerId };
      }
      return s;
    default:
      return s;
  }
}
