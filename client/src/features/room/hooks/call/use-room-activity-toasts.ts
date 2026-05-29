"use client";

import { useEffect, useRef } from "react";
import { useRtcSocketContext } from "@/features/rtc";
import {
  createRoomActivityToastTracker,
  syncPeerActivityToasts,
  syncScreenShareActivityToasts,
  type RoomActivityToastTracker,
} from "@/features/room/lib/call/room-activity";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
} from "@/lib/redux/selectors/room-selectors";

/**
 * In-call activity toasts: peer join/leave and screen share start/stop.
 * Skips the initial roster on join so existing participants do not spam toasts.
 */
export function useRoomActivityToasts() {
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const { peers, mediasoupStatus, screenShareTiles, rtcRoomType } =
    useRtcSocketContext();

  const trackedRoomRef = useRef<string | null>(null);
  const trackerRef = useRef<RoomActivityToastTracker>(createRoomActivityToastTracker());

  const trackingActive =
    sessionActive && mediasoupStatus === "ready" && Boolean(activeRoomId);

  useEffect(() => {
    if (trackedRoomRef.current === activeRoomId) return;
    trackedRoomRef.current = activeRoomId;
    trackerRef.current = createRoomActivityToastTracker();
  }, [activeRoomId]);

  useEffect(() => {
    if (!trackingActive) {
      trackerRef.current = createRoomActivityToastTracker();
      return;
    }
    syncPeerActivityToasts(trackerRef.current, peers, rtcRoomType);
  }, [peers, rtcRoomType, trackingActive]);

  useEffect(() => {
    if (!trackingActive) return;
    syncScreenShareActivityToasts(trackerRef.current, screenShareTiles);
  }, [screenShareTiles, trackingActive]);
}
