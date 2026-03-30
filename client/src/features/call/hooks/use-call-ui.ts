"use client";

import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  startCall,
  endCall,
  minimizeCall,
  expandCall,
} from "@/lib/redux/slices/callSlice";
import {
  selectActiveRoomId,
  selectIsCallActive,
  selectIsCallMinimized,
} from "@/lib/redux/selectors/call-selectors";

/**
 * Single entry point for call UI state: backed by Redux so any route can read/update it.
 */
export function useCallUi() {
  const dispatch = useAppDispatch();
  const isActive = useAppSelector(selectIsCallActive);
  const isMinimized = useAppSelector(selectIsCallMinimized);
  const activeRoomId = useAppSelector(selectActiveRoomId);

  const actions = useMemo(
    () => ({
      startCall: (payload?: { roomId?: string | null }) =>
        dispatch(startCall(payload)),
      endCall: () => dispatch(endCall()),
      minimizeCall: () => dispatch(minimizeCall()),
      expandCall: () => dispatch(expandCall()),
    }),
    [dispatch],
  );

  return {
    /** True while a call session is active (fullscreen or minimized). */
    isActive,
    isMinimized,
    activeRoomId,
    /** Alias for product language: user is in an active call. */
    isInCall: isActive,
    actions,
  };
}
