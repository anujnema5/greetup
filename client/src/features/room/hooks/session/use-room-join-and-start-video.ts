"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AppDispatch } from "@/lib/redux/store";
import { startVideoSession } from "@/lib/redux/slices/room-slice";
import { useJoinRoomMutation } from "@/features/room/api/room-api";
import { rtcTokenCacheTag } from "@/features/rtc/api/rtc-api";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
import { baseApi } from "@/lib/api";
import { markRoomActive } from "@/features/room/lib/session/room-sync";

export function useRoomJoinAndStartVideo({
  roomId,
  shouldStartVideo,
  sessionActive,
  joinWhileSessionActive,
  peerId,
  dispatch,
}: {
  roomId: string;
  shouldStartVideo: boolean;
  sessionActive: boolean;
  joinWhileSessionActive?: boolean;
  peerId: string | null;
  dispatch: AppDispatch;
}) {
  const [joinRoomErrorState, setJoinRoomErrorState] = useState<{
    roomId: string;
    message: string;
  } | null>(null);
  const [joinRoom, { isLoading: joinRoomLoading }] = useJoinRoomMutation();

  useEffect(() => {
    if (!shouldStartVideo) return;
    if (sessionActive && !joinWhileSessionActive) return;

    let cancelled = false;
    void joinRoom(roomId)
      .unwrap()
      .then(() => {
        if (cancelled) return;
        markRoomActive();
        dispatch(startVideoSession({ roomId, primaryRemoteUserId: peerId ?? null }));
        dispatch(baseApi.util.invalidateTags([rtcTokenCacheTag(roomId)]));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = getRtkMutationErrorMessage(err, "Could not join this room");
        if (joinWhileSessionActive) return;
        setJoinRoomErrorState({ roomId, message });
        toast.error(message, { id: `join-room-${roomId}` });
      });
    return () => {
      cancelled = true;
    };
  }, [shouldStartVideo, sessionActive, joinWhileSessionActive, roomId, peerId, dispatch, joinRoom]);

  const joinRoomError = joinRoomErrorState?.roomId === roomId ? joinRoomErrorState.message : null;

  return { joinRoomError, joinRoomLoading };
}
