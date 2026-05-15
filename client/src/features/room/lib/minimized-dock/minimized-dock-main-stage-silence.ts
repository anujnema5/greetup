/**
 * Tracks last non-null dominant speaker for the minimized dock.
 * Server clears `dominantSpeaker` on silence — we still keep that peer on the main tile until
 * someone else becomes dominant (avoids snapping back to `remoteParticipants[0]` sort order).
 */

export type MinimizedDockSilenceState = {
  lastNonNullDominant: string | null;
};

export const initialMinimizedDockSilenceState: MinimizedDockSilenceState = {
  lastNonNullDominant: null,
};

export type MinimizedDockSilenceAction = { type: "apply_dominant"; peerId: string | null };

export function minimizedDockSilenceReducer(
  s: MinimizedDockSilenceState,
  a: MinimizedDockSilenceAction,
): MinimizedDockSilenceState {
  switch (a.type) {
    case "apply_dominant":
      if (a.peerId !== null) {
        if (s.lastNonNullDominant === a.peerId) return s;
        return { lastNonNullDominant: a.peerId };
      }
      return s;
    default:
      return s;
  }
}
