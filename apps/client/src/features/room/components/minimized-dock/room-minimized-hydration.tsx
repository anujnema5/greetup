"use client";

import { useEffect } from "react";
import { useRoomStore } from "@/features/room/state/room.store";
import {
  isRoomMarkedActive,
  isRoomMinimizedMarked,
} from "@/features/room/lib/session/room-sync";

/** Restores minimized dock state after refresh when session markers are set. */
export function RoomMinimizedHydration() {
  const startVideoSession = useRoomStore((s) => s.startVideoSession);
  const minimizeVideoSession = useRoomStore((s) => s.minimizeVideoSession);

  useEffect(() => {
    if (isRoomMarkedActive() && isRoomMinimizedMarked()) {
      startVideoSession();
      minimizeVideoSession();
    }
  }, [minimizeVideoSession, startVideoSession]);

  return null;
}
