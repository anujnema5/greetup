"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { useMatchmaking } from "@/features/matching";
import { useLeaveSpaceRtc } from "@/features/room/api/room.mutations";
import { SPACE_HOST_END_FOR_EVERYONE_REDIRECT_PATH } from "@/features/room/constants/call/call-flow";
import { cancelMatchmakingThenNavigate } from "@/features/room/lib/navigation/after-call-navigation";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import { subscribeSpaceRoomSocketEvents } from "@/features/room/lib/socket/space-room-socket-subscribe";
import { parseSpaceHostEndedForEveryonePayload } from "@/features/room/types/socket/space-room-socket.types";
import {
  selectSpaceRoomListenerSnapshot,
  userIsInThisSpaceSession,
} from "@/features/room/lib/session/space-room-listener";
import { useRoomStore } from "@/features/room/state/room.store";
import { useSocket } from "@/lib/socket";

/**
 * When the host ends the space for everyone, the API emits to every participant.
 * This bridge tears down local UI + RTC for anyone still in that room, then sends them home.
 */
export function OnHostEndedSpace() {
  const { socket } = useSocket();
  const router = useRouter();
  const endVideoSession = useRoomStore((s) => s.endVideoSession);
  const matchmaking = useMatchmaking();
  const { mutateAsync: leaveSpaceRtc } = useLeaveSpaceRtc();

  const roomSnapshot = useRoomStore(
    useShallow((s) => selectSpaceRoomListenerSnapshot(s)),
  );
  const snapshotRef = useRef(roomSnapshot);

  useEffect(() => {
    snapshotRef.current = roomSnapshot;
  }, [roomSnapshot]);

  useEffect(() => {
    const onHostEndedSpace = (payload: unknown) => {
      const parsed = parseSpaceHostEndedForEveryonePayload(payload);
      if (!parsed) return;

      if (!userIsInThisSpaceSession(snapshotRef.current, parsed.roomId)) return;

      toast.info("The host ended this space.");
      clearRoomStorage();
      endVideoSession();

      void leaveSpaceRtc(parsed.roomId)
        .catch(() => {})
        .finally(() => {
          cancelMatchmakingThenNavigate(
            matchmaking,
            router,
            SPACE_HOST_END_FOR_EVERYONE_REDIRECT_PATH,
          );
        });
    };

    return subscribeSpaceRoomSocketEvents(socket, "hostEndedForEveryone", onHostEndedSpace);
  }, [endVideoSession, leaveSpaceRtc, matchmaking, router, socket]);

  return null;
}
