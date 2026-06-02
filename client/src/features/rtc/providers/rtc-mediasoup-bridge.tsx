"use client";

import { useEffect, useRef } from "react";

import { useAppDispatch } from "@/lib/redux/hooks";
import { setMediaStatus } from "@/lib/redux/slices/room-slice";

import { useMediasoupRoom } from "../hooks/use-mediasoup-room";
import { getMediasoupSnapshotKey } from "../lib/mediasoup-snapshot-key";
import { mapMediasoupToSliceStatus } from "../lib/map-mediasoup-slice-status";
import type {
  UseMediasoupRoomArgs,
  UseMediasoupRoomReturn,
} from "../types/mediasoup-room.types";

type RtcMediasoupBridgeProps = UseMediasoupRoomArgs & {
  sessionActive: boolean;
  onStateChange: (state: UseMediasoupRoomReturn) => void;
};

/** Loads mediasoup-client in a separate chunk — only when a video session is active. */
export function RtcMediasoupBridge({
  sessionActive,
  onStateChange,
  ...options
}: RtcMediasoupBridgeProps) {
  const dispatch = useAppDispatch();
  const mediasoup = useMediasoupRoom(options);
  const lastSnapshotRef = useRef("");

  useEffect(() => {
    const snapshot = getMediasoupSnapshotKey(mediasoup);
    if (snapshot === lastSnapshotRef.current) return;
    lastSnapshotRef.current = snapshot;
    onStateChange(mediasoup);
  }, [mediasoup, onStateChange]);

  useEffect(() => {
    dispatch(setMediaStatus(mapMediasoupToSliceStatus(sessionActive, mediasoup.status)));
  }, [dispatch, sessionActive, mediasoup.status]);

  return null;
}
