"use client";

import { useSyncExternalStore } from "react";
import {
  getMobileWebRtcUiHintServerSnapshot,
  getMobileWebRtcUiHintSnapshot,
  subscribeMobileWebRtcUiHints,
} from "@/features/rtc/lib/rtc-mobile-profile";

/**
 * Live “mobile / touch-primary Web” flag for components that cannot call `window` during SSR.
 * See {@link subscribeMobileWebRtcUiHints} for when this updates (viewport, pointer mode, etc.).
 */
export function useMobileWebRtcUi(): boolean {
  return useSyncExternalStore(
    subscribeMobileWebRtcUiHints,
    getMobileWebRtcUiHintSnapshot,
    getMobileWebRtcUiHintServerSnapshot,
  );
}
