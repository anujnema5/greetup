"use client";

import { useMemo } from "react";
import {
  selectActiveRoomId,
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
  selectRoomPhase,
  useRoomStore,
} from "@/features/room/state/room.store";

/**
 * Global room / video session UI — read from any route (e.g. minimized dock while browsing).
 */
export function useRoomUi() {
  const sessionActive = useRoomStore(selectIsVideoSessionActive);
  const isMinimized = useRoomStore(selectIsRoomMinimized);
  const activeRoomId = useRoomStore(selectActiveRoomId);
  const phase = useRoomStore(selectRoomPhase);

  const startVideoSession = useRoomStore((s) => s.startVideoSession);
  const endVideoSession = useRoomStore((s) => s.endVideoSession);
  const minimizeVideoSession = useRoomStore((s) => s.minimizeVideoSession);
  const expandVideoSession = useRoomStore((s) => s.expandVideoSession);
  const setRtcPrimaryRemoteUserId = useRoomStore((s) => s.setRtcPrimaryRemoteUserId);

  const actions = useMemo(
    () => ({
      startVideoSession: (
        payload?: { roomId?: string | null; primaryRemoteUserId?: string | null },
      ) => startVideoSession(payload),
      endVideoSession: () => endVideoSession(),
      minimizeVideoSession: () => minimizeVideoSession(),
      expandVideoSession: () => expandVideoSession(),
      setRtcPrimaryRemoteUserId: (userId: string | null) =>
        setRtcPrimaryRemoteUserId(userId),
    }),
    [
      endVideoSession,
      expandVideoSession,
      minimizeVideoSession,
      setRtcPrimaryRemoteUserId,
      startVideoSession,
    ],
  );

  return {
    sessionActive,
    isMinimized,
    activeRoomId,
    phase,
    /** Same as `sessionActive` — product language. */
    isInCall: sessionActive,
    actions,
  };
}
