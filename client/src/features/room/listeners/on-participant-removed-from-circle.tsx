"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { shallowEqual } from "react-redux";

import { useMatchmaking } from "@/features/matching";
import { useLeaveCircleRtcMutation } from "@/features/room/api/room-api";
import { MATCHMAKING_HUB_PATH } from "@/features/room/constants/call/call-flow";
import { cancelMatchmakingThenNavigate } from "@/features/room/lib/navigation/after-call-navigation";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import {
  CIRCLE_ROOM_SOCKET_EVENTS,
  parseCircleParticipantRemovedPayload,
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
 * When the host removes a participant, they receive this event and should leave RTC + UI.
 */
export function OnParticipantRemovedFromCircle() {
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
    const event = CIRCLE_ROOM_SOCKET_EVENTS.participantRemoved;

    const onRemoved = (payload: unknown) => {
      const parsed = parseCircleParticipantRemovedPayload(payload);
      if (!parsed) return;

      if (!userIsInThisCircleSession(snapshotRef.current, parsed.roomId)) return;

      toast.info("You were removed from this circle.");
      clearRoomStorage();
      dispatch(endVideoSession());

      void leaveCircleRtc(parsed.roomId)
        .unwrap()
        .catch(() => {})
        .finally(() => {
          cancelMatchmakingThenNavigate(matchmaking, router, MATCHMAKING_HUB_PATH);
        });
    };

    socket.on(event, onRemoved);
    return () => {
      socket.off(event, onRemoved);
    };
  }, [dispatch, leaveCircleRtc, matchmaking, router, socket]);

  return null;
}
