/**
 * Pure state machine for dock “silence sticky” + last non-null dominant.
 * Keeps {@link useMinimizedDockMainStage} lean: one `dispatch` per server dominant change
 * instead of multiple `setState` + chained effects.
 */

export type MinimizedDockSilenceState = {
  lastNonNullDominant: string | null;
  silenceStartedAt: number | null;
  silenceStickyLive: boolean;
};

export const initialMinimizedDockSilenceState: MinimizedDockSilenceState = {
  lastNonNullDominant: null,
  silenceStartedAt: null,
  silenceStickyLive: false,
};

export type MinimizedDockSilenceAction =
  | { type: "apply_dominant"; peerId: string | null }
  | { type: "sticky_timer_fire" };

export function minimizedDockSilenceReducer(
  s: MinimizedDockSilenceState,
  a: MinimizedDockSilenceAction,
): MinimizedDockSilenceState {
  switch (a.type) {
    case "sticky_timer_fire":
      if (!s.silenceStickyLive) return s;
      return { ...s, silenceStickyLive: false };

    case "apply_dominant":
      if (a.peerId !== null) {
        if (
          s.lastNonNullDominant === a.peerId &&
          s.silenceStartedAt === null &&
          !s.silenceStickyLive
        ) {
          return s;
        }
        return {
          lastNonNullDominant: a.peerId,
          silenceStartedAt: null,
          silenceStickyLive: false,
        };
      }
      if (s.lastNonNullDominant === null) return s;
      // Sticky window already ended for this silence episode — don’t re-arm on duplicate apply.
      if (!s.silenceStickyLive && s.silenceStartedAt !== null) return s;
      // Already armed for this silence — duplicate microtask / Strict Mode.
      if (s.silenceStickyLive) return s;
      return {
        ...s,
        silenceStartedAt: s.silenceStartedAt ?? Date.now(),
        silenceStickyLive: true,
      };
    default:
      return s;
  }
}
