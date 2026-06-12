"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRoomStore } from "@/features/room/state/room.store";
import { useJoinRoom } from "@/features/room/api/room.mutations";
import { getApiErrorMessage } from "@/lib/api/fetch-client";
import { resetRtcConnectTiming, rtcMark } from "@/features/rtc/lib/rtc-connect-timing";
import { prefetchRtcLiveSessionChunk } from "@/features/rtc/lib/prefetch-rtc-live-session-chunk";
import { markRoomActive } from "@/features/room/lib/session/room-sync";

export function useRoomJoinAndStartVideo({
  roomId,
  shouldStartVideo,
  sessionActive,
  joinWhileSessionActive,
  peerId,
}: {
  roomId: string;
  shouldStartVideo: boolean;
  sessionActive: boolean;
  joinWhileSessionActive?: boolean;
  peerId: string | null;
}) {
  const [joinRoomErrorState, setJoinRoomErrorState] = useState<{
    roomId: string;
    message: string;
  } | null>(null);
  const { mutateAsync: joinRoom, isPending: joinRoomLoading } = useJoinRoom();
  const startVideoSession = useRoomStore((s) => s.startVideoSession);

  useEffect(() => {
    if (!shouldStartVideo) return;
    if (sessionActive && !joinWhileSessionActive) return;

    let cancelled = false;
    resetRtcConnectTiming();
    rtcMark("join-start");
    rtcMark("token-start");
    prefetchRtcLiveSessionChunk();
    void joinRoom(roomId)
      .then((joinResult) => {
        if (cancelled) return;
        rtcMark("join-done");
        if (joinResult.rtc?.token) {
          rtcMark("token-ready");
        }
        markRoomActive();
        startVideoSession({ roomId, primaryRemoteUserId: peerId ?? null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = getApiErrorMessage(err, "Could not join this room");
        if (joinWhileSessionActive) return;
        setJoinRoomErrorState({ roomId, message });
        toast.error(message, { id: `join-room-${roomId}` });
      });
    return () => {
      cancelled = true;
    };
  }, [
    shouldStartVideo,
    sessionActive,
    joinWhileSessionActive,
    roomId,
    peerId,
    startVideoSession,
    joinRoom,
  ]);

  const joinRoomError = joinRoomErrorState?.roomId === roomId ? joinRoomErrorState.message : null;

  return { joinRoomError, joinRoomLoading };
}
