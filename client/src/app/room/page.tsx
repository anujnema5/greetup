"use client";

import { useEffect, useRef, Suspense, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAppDispatch } from "@/lib/redux/hooks";
import { startCall, endCall, minimizeCall, expandCall } from "@/lib/redux/slices/callSlice";
import { getCallReturnPath } from "@/lib/call/call-return-path";
import { ConnectedView } from "@/components/connected-view";
import {
  clearCallSession,
  clearCallMinimized,
  markCallSessionActive,
  markCallMinimized,
  subscribeCallChannel,
  broadcastCallMessage,
} from "@/lib/call/call-sync";

function RoomContent() {
  const pathname = usePathname();
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

  const handleEnd = () => {
    clearCallSession();
    dispatch(endCall());
    broadcastCallMessage({ type: "END_CALL" });
    router.replace("/");
  };

  const handleSkip = useCallback(() => {
    applySkip();
  }, [applySkip]);

  const handleMinimize = useCallback(() => {
    markCallMinimized();
    dispatch(minimizeCall());
    const dest = getCallReturnPath() ?? "/";
    router.replace(dest);
  }, [dispatch, router]);

  return (
    <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-background">
      <ConnectedView
        onEnd={handleEnd}
        onSkip={handleSkip}
        onMinimize={handleMinimize}
      />
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center bg-background text-muted-foreground text-sm">
          Loading room…
        </div>
      }
    >
      <RoomContent />
    </Suspense>
  );
}
