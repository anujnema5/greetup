"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { startVideoSession, minimizeVideoSession } from "@/lib/redux/slices/room-slice";
import {
  isRoomMarkedActive,
  isRoomMinimizedMarked,
} from "@/features/room/lib/room-sync";

/** Restores minimized dock state after refresh when session markers are set. */
export function RoomMinimizedHydration() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isRoomMarkedActive() && isRoomMinimizedMarked()) {
      dispatch(startVideoSession());
      dispatch(minimizeVideoSession());
    }
  }, [dispatch]);

  return null;
}
