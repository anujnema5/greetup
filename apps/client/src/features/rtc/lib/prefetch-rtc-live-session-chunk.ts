type RtcLiveSessionModule = typeof import("@/features/rtc/providers/rtc-live-session-provider");

let chunkPromise: Promise<RtcLiveSessionModule> | null = null;

/**
 * Starts downloading the mediasoup RTC chunk early (room route / join).
 * Safe to call multiple times — deduped to a single dynamic import.
 */
export function prefetchRtcLiveSessionChunk(): void {
  if (chunkPromise) return;
  chunkPromise = import("@/features/rtc/providers/rtc-live-session-provider");
}

/** Used by `RtcSocketProvider` lazy() — reuses the prefetched promise when available. */
export function loadRtcLiveSessionProviderLazy(): Promise<{
  default: RtcLiveSessionModule["RtcLiveSessionProvider"];
}> {
  prefetchRtcLiveSessionChunk();
  return chunkPromise!.then((mod) => ({ default: mod.RtcLiveSessionProvider }));
}
