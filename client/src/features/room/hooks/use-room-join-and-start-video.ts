"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AppDispatch } from "@/lib/redux/store";
import { startVideoSession } from "@/lib/redux/slices/room-slice";
import { useJoinRoomMutation } from "@/features/room/api/room-api";
import { getRtkMutationErrorMessage } from "@/lib/api/rtk-mutation-error";
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
  const [joinRoomErrorState, setJoinRoomErrorState] = useState<{
    roomId: string;
    message: string;
  } | null>(null);
  const [joinRoom, { isLoading: joinRoomLoading }] = useJoinRoomMutation();

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
        if (!cancelled) {
          const message = getRtkMutationErrorMessage(err, "Could not join this room");
          setJoinRoomErrorState({
            roomId,
            message,
          });
          toast.error(message, { id: `join-room-${roomId}` });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [shouldStartVideo, sessionActive, roomId, peerId, dispatch, joinRoom]);

  const joinRoomError = joinRoomErrorState?.roomId === roomId ? joinRoomErrorState.message : null;

  return { joinRoomError, joinRoomLoading };
}
