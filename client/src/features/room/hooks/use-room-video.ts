"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/redux/hooks";
import { endVideoSession, expandVideoSession, minimizeVideoSession } from "@/lib/redux/slices/roomSlice";
import { getRoomReturnPath } from "@/features/room/lib/room-return-path";
import {
  clearRoomStorage,
  clearRoomMinimized,
  markRoomActive,
  markRoomMinimized,
  subscribeRoomChannel,
  broadcastRoomMessage,
} from "@/features/room/lib/room-sync";

/**
 * Full-screen room video: active markers, BroadcastChannel, end / skip / minimize.
 * Mount only under `/circle/[roomId]` when video UI is shown (`startVideoSession` already dispatched).
 *
 * Pass `{ skipSetup: true }` when using from the minimized dock so the hook
 * only provides action handlers without claiming room-active markers or
 * subscribing to the BroadcastChannel (the room page owns those).
 */
export function useRoomVideo(roomId: string, options?: { skipSetup?: boolean }) {
  const skipSetup = options?.skipSetup ?? false;
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (skipSetup) return;
    markRoomActive();
    clearRoomMinimized();
    dispatch(expandVideoSession());
  }, [dispatch, skipSetup]);

  const applySkip = useCallback(() => {
    clearRoomStorage();
    dispatch(endVideoSession());
    router.replace("/explore");
  }, [dispatch, router]);

  useEffect(() => {
    if (skipSetup) return;
    const unsub = subscribeRoomChannel((msg) => {
      if (msg.type === "END_CALL") {
        clearRoomStorage();
        dispatch(endVideoSession());
        router.replace("/");
      }
      if (msg.type === "SKIP_CALL") {
        applySkip();
      }
    });
    return unsub;
  }, [dispatch, router, applySkip, skipSetup]);

  const handleEnd = useCallback(() => {
    clearRoomStorage();
    dispatch(endVideoSession());
    broadcastRoomMessage({ type: "END_CALL" });
    router.replace("/");
  }, [dispatch, router]);

  const handleSkip = useCallback(() => {
    broadcastRoomMessage({ type: "SKIP_CALL" });
    applySkip();
  }, [applySkip]);

  const handleMinimize = useCallback(() => {
    markRoomMinimized();
    dispatch(minimizeVideoSession());
    const dest = getRoomReturnPath() ?? "/";
    router.replace(dest);
  }, [dispatch, router]);

  return { handleEnd, handleSkip, handleMinimize, roomId };
}
