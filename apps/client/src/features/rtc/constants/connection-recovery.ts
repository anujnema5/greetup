export const RTC_CONNECTION_RECOVERY = {
  /**
   * Minimum delay between ICE restarts on the same transport.
   * Prevents restart loops during prolonged unstable connectivity.
   */
  iceRestartMinGapMs: 3_000,
  recoverableTransportStates: new Set(["disconnected", "failed"]),
} as const;

export const ICE_RESTART_MIN_GAP_MS = RTC_CONNECTION_RECOVERY.iceRestartMinGapMs;

export type RecoverableTransportState = "disconnected" | "failed";

const RECOVERABLE_TRANSPORT_STATES: ReadonlySet<string> =
  RTC_CONNECTION_RECOVERY.recoverableTransportStates;

export function isRecoverableTransportState(state: string): state is RecoverableTransportState {
  return RECOVERABLE_TRANSPORT_STATES.has(state);
}
