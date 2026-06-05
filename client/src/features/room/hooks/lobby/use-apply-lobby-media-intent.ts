"use client";

import { useEffect } from "react";
import {
  clearLobbyMediaIntent,
  isLobbyMediaIntentFulfilled,
  peekLobbyMediaIntent,
} from "@/features/room/lib/lobby";

type UseApplyLobbyMediaIntentArgs = {
  /** Mediasoup session is ready to produce local tracks. */
  mediasoupReady: boolean;
  micEnabled: boolean;
  cameraEnabled: boolean;
  toggleMic: () => void;
  toggleCamera: () => void;
};

/**
 * When the circle lobby had mic/camera on, enable the same devices in the call.
 * Retries on each `ready` transition (e.g. after ICE reconnect) until fulfilled.
 */
export function useApplyLobbyMediaIntent({
  mediasoupReady,
  micEnabled,
  cameraEnabled,
  toggleMic,
  toggleCamera,
}: UseApplyLobbyMediaIntentArgs): void {
  useEffect(() => {
    if (!mediasoupReady) return;

    const intent = peekLobbyMediaIntent();
    if (!intent) return;

    if (!intent.mic && !intent.camera) {
      clearLobbyMediaIntent();
      return;
    }

    if (intent.mic && !micEnabled) toggleMic();
    if (intent.camera && !cameraEnabled) toggleCamera();

    if (isLobbyMediaIntentFulfilled(intent, micEnabled, cameraEnabled)) {
      clearLobbyMediaIntent();
    }
  }, [mediasoupReady, micEnabled, cameraEnabled, toggleMic, toggleCamera]);
}
