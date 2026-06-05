export const DIRECT_CALL_RECOVERY = {
  /** Match rematch — keep snappy after a real peer leave. */
  matchPeerLeftDebounceMs: 200,
  /** Connection call — absorb RTC reconnect / dev compile jitter before recovery window. */
  connectionCallPeerLeftDebounceMs: 3_000,
  /** Dev-only extra grace while Turbopack/HMR churns RTC sockets. */
  connectionCallPeerLeftDebounceMsDev: 5_000,
  /**
   * After debounce, wait this long for the peer to reappear before ending a connection call.
   * If connectivity recovers before this elapses, the call continues.
   */
  networkRecoveryTimeoutMs: 15_000,
  /**
   * While staying in-room and searching for a replacement match, retry quickly when
   * the backend reports `no_match` so users do not get stuck in an error state.
   */
  searchRetryDelayMs: 1_200,
} as const;

/** @deprecated Prefer {@link DIRECT_CALL_RECOVERY.matchPeerLeftDebounceMs}. */
export const DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS = DIRECT_CALL_RECOVERY.matchPeerLeftDebounceMs;

export const DIRECT_CALL_NETWORK_RECOVERY_TIMEOUT_MS =
  DIRECT_CALL_RECOVERY.networkRecoveryTimeoutMs;

export function resolveConnectionCallPeerLeftDebounceMs(): number {
  if (process.env.NODE_ENV === "development") {
    return DIRECT_CALL_RECOVERY.connectionCallPeerLeftDebounceMsDev;
  }
  return DIRECT_CALL_RECOVERY.connectionCallPeerLeftDebounceMs;
}
