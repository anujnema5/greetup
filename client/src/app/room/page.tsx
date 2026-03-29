"use client";

import { useEffect, useRef, Suspense, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAppDispatch } from "@/lib/redux/hooks";
import { startCall, endCall } from "@/lib/redux/slices/callSlice";
import { ConnectedView } from "@/components/connected-view";
import {
  clearCallSession,
  isCallSessionMarkedActive,
  subscribeCallChannel,
  broadcastCallMessage,
} from "@/lib/call/call-sync";
import {
  openDocumentPictureInPictureCall,
  dismissDocumentPip,
} from "@/lib/call/document-pip";
import { toast } from "sonner";

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
  const pipOpenInFlightRef = useRef(false);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPip) return;

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        dismissDocumentPip();
        return;
      }
      if (document.visibilityState !== "hidden") return;
      if (pipOpenInFlightRef.current) return;
      if (readPipFromLocation()) return;

      pipOpenInFlightRef.current = true;
      void (async () => {
        try {
          const ok = await openDocumentPictureInPictureCall();
          if (!ok) {
            console.error("Couldn’t open the floating call window (try Chrome or Edge).");
          }
        } finally {
          pipOpenInFlightRef.current = false;
        }
      })();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isPip]);

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
