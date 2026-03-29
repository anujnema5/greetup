"use client";

import { useEffect, useRef, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAppDispatch } from "@/lib/redux/hooks";
import { startCall, endCall, minimizeCall, expandCall } from "@/lib/redux/slices/callSlice";
import { getCallReturnPath } from "@/lib/call/call-return-path";
import { ConnectedView } from "@/components/connected-view";
import {
  clearCallSession,
  clearCallMinimized,
  isCallSessionMarkedActive,
  markCallMinimized,
  subscribeCallChannel,
  broadcastCallMessage,
} from "@/lib/call/call-sync";
import { dismissDocumentPip } from "@/lib/call/document-pip";

/** Authoritative pip flag — `useSearchParams()` can lag one frame and close the real PiP/popup. */
function readPipFromLocation(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("pip") === "1";
}

function RoomContent() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hydrated = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);
  const sp = searchParams.toString();

  const isPip = useMemo(() => {
    if (typeof window !== "undefined") {
      return readPipFromLocation();
    }
    return new URLSearchParams(sp).get("pip") === "1";
  }, [sp, pathname]);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    if (isCallSessionMarkedActive()) {
      dispatch(startCall());
    }
  }, [dispatch]);

  useEffect(() => {
    if (isPip) return;
    clearCallMinimized();
    dispatch(expandCall());
  }, [isPip, dispatch]);

  const applySkip = useCallback(() => {
    clearCallSession();
    dispatch(endCall());
    dismissDocumentPip();
    if (readPipFromLocation()) window.close();
    else router.replace("/explore");
  }, [dispatch, router]);

  useEffect(() => {
    const unsub = subscribeCallChannel((msg) => {
      const pip = readPipFromLocation();
      if (msg.type === "END_CALL") {
        clearCallSession();
        dispatch(endCall());
        if (pip) window.close();
        else router.replace("/");
      }
      if (msg.type === "SKIP_CALL") {
        applySkip();
      }
      if (msg.type === "FULL_ROOM_FOREGROUND" && pip) {
        window.close();
      }
    });
    return unsub;
  }, [dispatch, router, applySkip]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const previous = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    if (!pathname.startsWith("/room")) return;
    if (readPipFromLocation()) return;

    const enteredFullRoom =
      previous === null || !previous.startsWith("/room");
    if (!enteredFullRoom) return;

    broadcastCallMessage({ type: "FULL_ROOM_FOREGROUND" });
  }, [pathname]);

  const handleEnd = () => {
    clearCallSession();
    dispatch(endCall());
    broadcastCallMessage({ type: "END_CALL" });
    if (readPipFromLocation()) window.close();
    else router.replace("/");
  };

  const handleSkip = useCallback(() => {
    if (readPipFromLocation()) {
      broadcastCallMessage({ type: "SKIP_CALL" });
    }
    applySkip();
  }, [applySkip]);

  const handleMinimize = useCallback(() => {
    dismissDocumentPip();
    markCallMinimized();
    dispatch(minimizeCall());
    const dest = getCallReturnPath() ?? "/";
    router.replace(dest);
  }, [dispatch, router]);

  return (
    <div
      className={
        isPip
          ? "h-dvh w-full overflow-hidden bg-background"
          : "fixed inset-0 z-100 flex flex-col overflow-hidden bg-background"
      }
    >
      <ConnectedView
        variant={isPip ? "pip" : "room"}
        onEnd={handleEnd}
        onSkip={handleSkip}
        onMinimize={isPip ? undefined : handleMinimize}
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
