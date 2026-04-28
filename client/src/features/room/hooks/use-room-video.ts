"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  beginSearchingNextCall,
  endVideoSession,
  expandVideoSession,
  minimizeVideoSession,
} from "@/lib/redux/slices/room-slice";
import { MATCHMAKING_HUB_PATH } from "@/features/room/constants/call-flow";
import { getRoomReturnPath } from "@/features/room/lib/room-return-path";
import {
  clearRoomStorage,
  clearRoomMinimized,
  markRoomActive,
  markRoomMinimized,
  subscribeRoomChannel,
  broadcastRoomMessage,
} from "@/features/room/lib/room-sync";
import { useMatchmaking } from "@/features/matching";
import { useLeaveRoomMutation } from "@/features/room/api/room-api";

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
  const matchmaking = useMatchmaking();
  const [leaveRoom] = useLeaveRoomMutation();
  const skipHandledRef = useRef(false);
  const endHandledRef = useRef(false);

  useEffect(() => {
    if (skipSetup) return;
    markRoomActive();
    clearRoomMinimized();
    dispatch(expandVideoSession());
  }, [dispatch, skipSetup]);

  const beginSearchAfterSkip = useCallback(() => {
    if (skipHandledRef.current) return;
    skipHandledRef.current = true;
    dispatch(beginSearchingNextCall());
    void leaveRoom()
      .unwrap()
      .catch(() => {})
      .finally(() => {
        void matchmaking.restartSearch();
      });
  }, [dispatch, leaveRoom, matchmaking]);

  useEffect(() => {
    if (skipSetup) return;
    const unsub = subscribeRoomChannel((msg) => {
      if (msg.type === "END_CALL") {
        clearRoomStorage();
        dispatch(endVideoSession());
        void matchmaking.handleCancel();
        router.replace(MATCHMAKING_HUB_PATH);
      }
      if (msg.type === "SKIP_CALL") {
        beginSearchAfterSkip();
      }
    });
    return unsub;
  }, [beginSearchAfterSkip, dispatch, matchmaking, router, skipSetup]);

  useEffect(() => {
    if (!skipHandledRef.current) return;
    if (matchmaking.status !== "searching" && matchmaking.status !== "proposed") return;
    skipHandledRef.current = false;
  }, [matchmaking.status]);

  const handleEnd = useCallback(() => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    clearRoomStorage();
    dispatch(endVideoSession());
    broadcastRoomMessage({ type: "END_CALL" });
    void matchmaking.handleCancel();
    void leaveRoom()
      .unwrap()
      .catch(() => {})
      .finally(() => {
        router.replace(MATCHMAKING_HUB_PATH);
      });
  }, [dispatch, leaveRoom, matchmaking, router]);

  const handleSkip = useCallback(() => {
    broadcastRoomMessage({ type: "SKIP_CALL" });
    beginSearchAfterSkip();
  }, [beginSearchAfterSkip]);

  const handleMinimize = useCallback(() => {
    markRoomMinimized();
    dispatch(minimizeVideoSession());
    const dest = getRoomReturnPath() ?? "/home";
    router.replace(dest);
  }, [dispatch, router]);

  return { handleEnd, handleSkip, handleMinimize, roomId };
}
