"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { endCall } from "@/lib/redux/slices/callSlice";
import {
  subscribeCallChannel,
  clearCallSession,
  isCallSessionMarkedActive,
} from "@/lib/call/call-sync";
import {
  dismissDocumentPip,
  openDocumentPictureInPictureCall,
} from "@/lib/call/document-pip";

function readPipFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("pip") === "1";
}

/**
 * Syncs Document PiP with BroadcastChannel (expand to full room, end call, etc.).
 * Also opens Chromium Document PiP when the user hides the tab while a call is active
 * (including minimized call — main `/room` is not mounted then).
 */
export function CallDocPipBridge() {
  const dispatch = useAppDispatch();
  const pipOpenInFlightRef = useRef(false);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        dismissDocumentPip();
        return;
      }
      if (document.visibilityState !== "hidden") return;
      if (pipOpenInFlightRef.current) return;
      if (readPipFromLocation()) return;
      if (!isCallSessionMarkedActive()) return;

      pipOpenInFlightRef.current = true;
      void (async () => {
        try {
          const ok = await openDocumentPictureInPictureCall();
          if (!ok) {
            console.error(
              "Couldn’t open the floating call window (try Chrome or Edge)."
            );
          }
        } finally {
          pipOpenInFlightRef.current = false;
        }
      })();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    return subscribeCallChannel((msg) => {
      if (msg.type === "REQUEST_FULL_ROOM") {
        dismissDocumentPip();
        return;
      }
      if (msg.type === "FULL_ROOM_FOREGROUND") {
        dismissDocumentPip();
        return;
      }
      if (msg.type === "END_CALL") {
        dismissDocumentPip();
        clearCallSession();
        dispatch(endCall());
      }
    });
  }, [dispatch]);

  return null;
}
