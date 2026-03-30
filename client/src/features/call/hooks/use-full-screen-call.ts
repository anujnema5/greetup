"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/redux/hooks";
import { startCall, endCall, minimizeCall, expandCall } from "@/lib/redux/slices/callSlice";
import { getCallReturnPath } from "@/features/call/lib/call-return-path";
import {
  clearCallSession,
  clearCallMinimized,
  markCallSessionActive,
  markCallMinimized,
  subscribeCallChannel,
  broadcastCallMessage,
} from "@/features/call/lib/call-sync";

/**
 * `/room` (full-screen `ConnectedView`): Redux call state, session markers, BroadcastChannel sync,
 * and handlers for end / skip / minimize. Used by that route and when expanding from the minimized dock.
 */
export function useFullScreenCall() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    markCallSessionActive();
    dispatch(startCall());
  }, [dispatch]);

  useEffect(() => {
    clearCallMinimized();
    dispatch(expandCall());
  }, [dispatch]);

  const applySkip = useCallback(() => {
    clearCallSession();
    dispatch(endCall());
    router.replace("/explore");
  }, [dispatch, router]);

  useEffect(() => {
    const unsub = subscribeCallChannel((msg) => {
      if (msg.type === "END_CALL") {
        clearCallSession();
        dispatch(endCall());
        router.replace("/");
      }
      if (msg.type === "SKIP_CALL") {
        applySkip();
      }
    });
    return unsub;
  }, [dispatch, router, applySkip]);

  const handleEnd = useCallback(() => {
    clearCallSession();
    dispatch(endCall());
    broadcastCallMessage({ type: "END_CALL" });
    router.replace("/");
  }, [dispatch, router]);

  const handleSkip = useCallback(() => {
    applySkip();
  }, [applySkip]);

  const handleMinimize = useCallback(() => {
    markCallMinimized();
    dispatch(minimizeCall());
    const dest = getCallReturnPath() ?? "/";
    router.replace(dest);
  }, [dispatch, router]);

  return { handleEnd, handleSkip, handleMinimize };
}
