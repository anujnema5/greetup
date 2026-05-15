"use client";

import { useEffect, useRef } from "react";
import {
  ROOM_TAB_LEASE_HEARTBEAT_MS,
  clearRoomTabLeaseIfOwner,
  getOrCreateTabInstanceId,
  touchRoomTabLease,
} from "@/features/room/lib/session/room-tab-lease";

type UseRoomTabLeaseRtcSyncArgs = {
  activeRoomId: string | null;
  sessionUserId: string | null | undefined;
  sessionActive: boolean;
};

/**
 * Keeps the tab lease timestamp fresh while Redux has an active room id (including minimized dock).
 * Clears the lease when the video session ends so another tab can join after a clean leave.
 */
export function useRoomTabLeaseRtcSync({
  activeRoomId,
  sessionUserId,
  sessionActive,
}: UseRoomTabLeaseRtcSyncArgs) {
  const prevSessionActiveRef = useRef(false);

  useEffect(() => {
    const uid = sessionUserId ?? null;
    if (!uid) return;
    const tabId = getOrCreateTabInstanceId();
    if (prevSessionActiveRef.current && !sessionActive) {
      clearRoomTabLeaseIfOwner(uid, tabId);
    }
    prevSessionActiveRef.current = sessionActive;
  }, [sessionActive, sessionUserId]);

  useEffect(() => {
    const uid = sessionUserId ?? null;
    if (!activeRoomId || !uid) return;
    const tabId = getOrCreateTabInstanceId();
    touchRoomTabLease(uid, activeRoomId, tabId);
    const interval = window.setInterval(() => {
      touchRoomTabLease(uid, activeRoomId, tabId);
    }, ROOM_TAB_LEASE_HEARTBEAT_MS);
    return () => window.clearInterval(interval);
  }, [activeRoomId, sessionUserId]);
}
