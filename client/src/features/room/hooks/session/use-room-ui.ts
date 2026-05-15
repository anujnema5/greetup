"use client";

import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  startVideoSession,
  endVideoSession,
  minimizeVideoSession,
  expandVideoSession,
  setRtcPrimaryRemoteUserId,
} from "@/lib/redux/slices/room-slice";
import {
  selectActiveRoomId,
  selectIsRoomMinimized,
  selectIsVideoSessionActive,
  selectRoomPhase,
} from "@/lib/redux/selectors/room-selectors";

/**
 * Global room / video session UI — read from any route (e.g. minimized dock while browsing).
 */
export function useRoomUi() {
  const dispatch = useAppDispatch();
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const isMinimized = useAppSelector(selectIsRoomMinimized);
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const phase = useAppSelector(selectRoomPhase);

  const actions = useMemo(
    () => ({
      startVideoSession: (
        payload?: { roomId?: string | null; primaryRemoteUserId?: string | null },
      ) => dispatch(startVideoSession(payload)),
      endVideoSession: () => dispatch(endVideoSession()),
      minimizeVideoSession: () => dispatch(minimizeVideoSession()),
      expandVideoSession: () => dispatch(expandVideoSession()),
      setRtcPrimaryRemoteUserId: (userId: string | null) =>
        dispatch(setRtcPrimaryRemoteUserId(userId)),
    }),
    [dispatch],
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
