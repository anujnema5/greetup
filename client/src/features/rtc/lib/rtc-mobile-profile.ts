/**
 * Mobile / touch-first Web detection for RTC and in-call UI.
 *
 * Used for:
 * - Lighter `getUserMedia` / simulcast (see `mediasoup-produce-config`, `use-mediasoup-local-media`)
 * - Hiding “start screen share” on phone browsers (toolbar + minimized dock)
 * - `useSyncExternalStore` subscribers so SSR/hydration stay consistent
 *
 * This is not the same as Tailwind breakpoints: a desktop with a narrow window stays “desktop”
 * unless the browser reports touch-primary input (`pointer: coarse`, etc.).
 */

// ─── Core detection ───────────────────────────────────────────────────────────

/**
 * True for typical phone/tablet Web: coarse pointer + no hover, OR touch + narrow viewport.
 */
export function isMobileRtcCaptureProfile(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const noHover = window.matchMedia("(hover: none)").matches;
    const hasTouch = (navigator.maxTouchPoints ?? 0) > 0;
    const narrowViewport = window.matchMedia("(max-width: 767px)").matches;

    if (coarsePointer && noHover) return true;
    if (hasTouch && narrowViewport) return true;
    return false;
  } catch {
    return false;
  }
}

// ─── Screen-share button (call UI) ───────────────────────────────────────────

/**
 * On mobile Web we do not offer starting screen share (policy + UX), but if sharing is already
 * active the user must still be able to stop. Desktop always sees the control when allowed.
 */
export function allowScreenShareCallControl(isMobileWebUi: boolean, currentlySharing: boolean): boolean {
  return !isMobileWebUi || currentlySharing;
}

// ─── useSyncExternalStore (React 18+ SSR-safe subscriptions) ────────────────

/** Media-query keys that can flip {@link isMobileRtcCaptureProfile} when the user rotates device etc. */
const MOBILE_PROFILE_MQS = ["(pointer: coarse)", "(hover: none)", "(max-width: 767px)"] as const;

export function subscribeMobileWebRtcUiHints(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const lists = MOBILE_PROFILE_MQS.map((query) => window.matchMedia(query));
  const onChange = () => onStoreChange();
  lists.forEach((mq) => mq.addEventListener("change", onChange));
  return () => lists.forEach((mq) => mq.removeEventListener("change", onChange));
}

export function getMobileWebRtcUiHintSnapshot(): boolean {
  return isMobileRtcCaptureProfile();
}

/** Server / static render: treat as non-mobile so first HTML matches desktop; client corrects after hydrate. */
export function getMobileWebRtcUiHintServerSnapshot(): boolean {
  return false;
}
