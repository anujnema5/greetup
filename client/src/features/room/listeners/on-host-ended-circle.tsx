"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { useMatchmaking } from "@/features/matching";
import { useLeaveCircleRtc } from "@/features/room/api/room.mutations";
import { CIRCLE_HOST_END_FOR_EVERYONE_REDIRECT_PATH } from "@/features/room/constants/call/call-flow";
import { cancelMatchmakingThenNavigate } from "@/features/room/lib/navigation/after-call-navigation";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import {
  CIRCLE_ROOM_SOCKET_EVENTS,
  parseCircleHostEndedForEveryonePayload,
} from "@/features/room/types/socket/circle-room-socket.types";
import {
  selectCircleRoomListenerSnapshot,
  userIsInThisCircleSession,
} from "@/features/room/lib/session/circle-room-listener";
import { useRoomStore } from "@/features/room/state/room.store";
import { useSocket } from "@/lib/socket";

/**
 * When the host ends the circle for everyone, the API emits to every participant.
 * This bridge tears down local UI + RTC for anyone still in that room, then sends them home.
 */
export function OnHostEndedCircle() {
  const { socket } = useSocket();
  const router = useRouter();
  const endVideoSession = useRoomStore((s) => s.endVideoSession);
  const matchmaking = useMatchmaking();
  const { mutateAsync: leaveCircleRtc } = useLeaveCircleRtc();

  const roomSnapshot = useRoomStore(
    useShallow((s) => selectCircleRoomListenerSnapshot(s)),
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
      endVideoSession();

      void leaveCircleRtc(parsed.roomId)
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
  }, [endVideoSession, leaveCircleRtc, matchmaking, router, socket]);

  return null;
}
