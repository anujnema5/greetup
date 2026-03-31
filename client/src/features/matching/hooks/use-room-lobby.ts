"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useAppDispatch } from "@/lib/redux/hooks";
import { endCall } from "@/lib/redux/slices/callSlice";
import { clearCallSession } from "@/features/call";
import { useLeaveRoomMutation, leaveRoomKeepalive } from "@/features/matching/api/matching-api";

export interface RoomLobbyData {
  roomId: string;
  userA: string;
  userB: string;
  matchScore: string | null;
}

/**
 * Match lobby `/room/[roomId]`: fetch room payload, clear stale minimized-call flags, leave room on exit.
 */
export function useRoomLobby() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { data: session } = useSession();
  const [leaveRoom] = useLeaveRoomMutation();

  const roomId = params.roomId as string;
  const peerIdFromUrl = searchParams.get("peer");
  const scoreFromUrl = searchParams.get("score");

  const [room, setRoom] = useState<RoomLobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearLocalCallUi = useCallback(() => {
    clearCallSession();
    dispatch(endCall());
  }, [dispatch]);

  useEffect(() => {
    clearLocalCallUi();
  }, [clearLocalCallUi]);

  const leaveRoomAndClearUi = useCallback(async () => {
    try {
      await leaveRoom().unwrap();
    } catch {
      // best-effort — still clear local UI
    }
    clearLocalCallUi();
  }, [leaveRoom, clearLocalCallUi]);

  useEffect(() => {
    const onBeforeUnload = () => {
      leaveRoomKeepalive();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`http://localhost:5050/api/room/${roomId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Room not found");
        const json = await res.json();
        setRoom(json.data);
      } catch {
        if (peerIdFromUrl && session?.user?.id) {
          setRoom({
            roomId,
            userA: session.user.id,
            userB: peerIdFromUrl,
            matchScore: scoreFromUrl,
          });
        } else {
          setError("Could not load room data.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomId, peerIdFromUrl, scoreFromUrl, session]);

  const currentUserId = session?.user?.id;

  const peerId = useMemo(
    () =>
      room
        ? room.userA === currentUserId
          ? room.userB
          : room.userA
        : peerIdFromUrl ?? null,
    [room, currentUserId, peerIdFromUrl]
  );

  const score = useMemo(() => room?.matchScore ?? scoreFromUrl, [room, scoreFromUrl]);

  const goHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const leaveAndGoHome = useCallback(() => {
    void leaveRoomAndClearUi().then(() => router.replace("/"));
  }, [leaveRoomAndClearUi, router]);

  return {
    roomId,
    room,
    loading,
    error,
    peerId,
    score,
    currentUserId,
    goHome,
    leaveAndGoHome,
  };
}
