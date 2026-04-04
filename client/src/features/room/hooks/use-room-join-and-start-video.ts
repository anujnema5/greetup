"use client";

import { useEffect, useState } from "react";
import type { AppDispatch } from "@/lib/redux/store";
import { startVideoSession } from "@/lib/redux/slices/roomSlice";
import { useJoinRoomMutation } from "@/features/matching";
import { getRtkQueryErrorMessage } from "@/lib/api/rtk-query-error";
import { markRoomActive } from "@/features/room/lib/room-sync";

/**
 * POST `/room/:id/join` then Redux `startVideoSession` when the route is ready for media.
 */
export function useRoomJoinAndStartVideo({
  roomId,
  shouldStartVideo,
  sessionActive,
  peerId,
  dispatch,
}: {
  roomId: string;
  shouldStartVideo: boolean;
  sessionActive: boolean;
  peerId: string | null;
  dispatch: AppDispatch;
}) {
  const [joinRoomError, setJoinRoomError] = useState<string | null>(null);
  const [joinRoom, { isLoading: joinRoomLoading }] = useJoinRoomMutation();

  useEffect(() => {
    setJoinRoomError(null);
  }, [roomId]);

  useEffect(() => {
    if (!shouldStartVideo || sessionActive) return;
    let cancelled = false;
    void joinRoom(roomId)
      .unwrap()
      .then(() => {
        if (cancelled) return;
        markRoomActive();
        dispatch(startVideoSession({ roomId, primaryRemoteUserId: peerId ?? null }));
      })
      .catch((err: unknown) => {
        if (!cancelled) setJoinRoomError(getRtkQueryErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [shouldStartVideo, sessionActive, roomId, peerId, dispatch, joinRoom]);

  return { joinRoomError, joinRoomLoading };
}
