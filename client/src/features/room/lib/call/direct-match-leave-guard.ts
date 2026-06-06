import { useRoomStore } from "@/features/room/state/room.store";

/** Module-level guards for direct 1:1 leave / rematch (avoids duplicate handlers racing). */

const LOCAL_END_GUARD_MS = 4_000;

let localCallEndInProgress = false;
let localCallEndGuardTimer: ReturnType<typeof setTimeout> | null = null;
let partnerSignalHandledRoomId: string | null = null;
let cancelPendingRtcFallback: (() => void) | null = null;

function clearLocalEndGuardTimer(): void {
  if (localCallEndGuardTimer != null) {
    clearTimeout(localCallEndGuardTimer);
    localCallEndGuardTimer = null;
  }
}

/** Leaver: searching=false, rematch disabled until redirect completes. */
export function markLocalCallEndInProgress(): void {
  localCallEndInProgress = true;
  useRoomStore.getState().setLocalLeavePending(true);
  clearLocalEndGuardTimer();
  localCallEndGuardTimer = setTimeout(() => {
    localCallEndInProgress = false;
    localCallEndGuardTimer = null;
    useRoomStore.getState().setLocalLeavePending(false);
  }, LOCAL_END_GUARD_MS);
}

export function isLocalCallEndInProgress(): boolean {
  return localCallEndInProgress;
}

export function registerMatchRtcFallbackCancel(cancel: () => void): void {
  cancelPendingRtcFallback?.();
  cancelPendingRtcFallback = cancel;
}

export function cancelPendingMatchRtcFallback(): void {
  cancelPendingRtcFallback?.();
  cancelPendingRtcFallback = null;
}

/** Returns false when this room was already handled via `match:partner_skipped`. */
export function markDirectMatchPartnerSignalHandled(roomId: string): boolean {
  if (partnerSignalHandledRoomId === roomId) return false;
  partnerSignalHandledRoomId = roomId;
  cancelPendingMatchRtcFallback();
  return true;
}

export function wasDirectMatchPartnerSignalHandled(roomId: string): boolean {
  return partnerSignalHandledRoomId === roomId;
}

export function clearDirectMatchPartnerSignalHandled(): void {
  partnerSignalHandledRoomId = null;
}
