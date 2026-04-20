export const DIRECT_CALL_RECOVERY = {
  /**
   * Short debounce before treating a healthy direct-call peer disappearance as a real leave.
   * Helps absorb brief signaling ordering jitter.
   */
  peerLeftDebounceMs: 200,
  /**
   * Grace period for temporary RTC/socket outages in direct calls.
   * If connectivity recovers before this elapses, the call continues.
   */
  networkRecoveryTimeoutMs: 15_000,
  /**
   * While staying in-room and searching for a replacement match, retry quickly when
   * the backend reports `no_match` so users do not get stuck in an error state.
   */
  searchRetryDelayMs: 1_200,
} as const;

export const DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS = DIRECT_CALL_RECOVERY.peerLeftDebounceMs;
export const DIRECT_CALL_NETWORK_RECOVERY_TIMEOUT_MS =
  DIRECT_CALL_RECOVERY.networkRecoveryTimeoutMs;
