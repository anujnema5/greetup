"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { shallowEqual } from "react-redux";

import { useMatchmaking } from "@/features/matching";
import { useLeaveCircleRtcMutation } from "@/features/room/api/room-api";
import { CIRCLE_HOST_END_FOR_EVERYONE_REDIRECT_PATH } from "@/features/room/constants/call/call-flow";
import { cancelMatchmakingThenNavigate } from "@/features/room/lib/navigation/after-call-navigation";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import {
  CIRCLE_ROOM_SOCKET_EVENTS,
  parseCircleHostEndedForEveryonePayload,
} from "@/features/room/types/socket/circle-room-socket.types";
import type { RoomSessionPhase } from "@/lib/redux/types/room-slice.types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { endVideoSession } from "@/lib/redux/slices/room-slice";
import { useSocket } from "@/lib/socket";

type RoomUiSnapshot = {
  activeRoomId: string | null;
  sessionActive: boolean;
  isMinimized: boolean;
  phase: RoomSessionPhase;
};

function userIsInThisCircleSession(snap: RoomUiSnapshot, roomId: string): boolean {
  if (roomId !== snap.activeRoomId) return false;
  return (
    snap.phase === "lobby" ||
    snap.phase === "in_call" ||
    snap.sessionActive ||
    snap.isMinimized
  );
}

/**
 * When the host ends the circle for everyone, the API emits to every participant.
 * This bridge tears down local UI + RTC for anyone still in that room, then sends them home.
 */
export function OnHostEndedCircle() {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const matchmaking = useMatchmaking();
  const [leaveCircleRtc] = useLeaveCircleRtcMutation();

  const roomSnapshot = useAppSelector(
    (s) => ({
      activeRoomId: s.room.session.activeRoomId,
      sessionActive: s.room.ui.sessionActive,
      isMinimized: s.room.ui.isMinimized,
      phase: s.room.session.phase,
    }),
    shallowEqual,
  );
  const snapshotRef = useRef(roomSnapshot);

  useEffect(() => {
    snapshotRef.current = roomSnapshot;
  }, [roomSnapshot]);

  useEffect(() => {
    const event = CIRCLE_ROOM_SOCKET_EVENTS.hostEndedForEveryone;

    const onHostEndedCircle = (payload: unknown) => {
      const parsed = parseCircleHostEndedForEveryonePayload(payload);
      if (!parsed) return;

      if (!userIsInThisCircleSession(snapshotRef.current, parsed.roomId)) return;

      toast.info("The host ended this circle.");
      clearRoomStorage();
      dispatch(endVideoSession());

      void leaveCircleRtc(parsed.roomId)
        .unwrap()
        .catch(() => {})
        .finally(() => {
          cancelMatchmakingThenNavigate(
            matchmaking,
            router,
            CIRCLE_HOST_END_FOR_EVERYONE_REDIRECT_PATH,
          );
        });
    };

    socket.on(event, onHostEndedCircle);
    return () => {
      socket.off(event, onHostEndedCircle);
    };
  }, [dispatch, leaveCircleRtc, matchmaking, router, socket]);

  return null;
}
