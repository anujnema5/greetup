"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { useMatchmaking } from "@/features/matching";
import { useLeaveSpaceRtc } from "@/features/room/api/room.mutations";
import { navigateAfterCallEnd } from "@/features/room/lib/navigation/after-call-navigation";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import { subscribeSpaceRoomSocketEvents } from "@/features/room/lib/socket/space-room-socket-subscribe";
import { parseSpaceParticipantRemovedPayload } from "@/features/room/types/socket/space-room-socket.types";
import {
  selectSpaceRoomListenerSnapshot,
  userIsInThisSpaceSession,
} from "@/features/room/lib/session/space-room-listener";
import { useRoomStore } from "@/features/room/state/room.store";
import { useSocket } from "@/lib/socket";

/**
 * When the host removes a participant, they receive this event and should leave RTC + UI.
 */
export function OnParticipantRemovedFromSpace() {
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
    const onRemoved = (payload: unknown) => {
      const parsed = parseSpaceParticipantRemovedPayload(payload);
      if (!parsed) return;

      if (!userIsInThisSpaceSession(snapshotRef.current, parsed.roomId)) return;

      if (parsed.reason === "nsfw") {
        if (parsed.strikeCount != null && parsed.strikeCount >= 2) {
          toast.error(
            "Your account was suspended for repeated inappropriate video. Contact support if you believe this is a mistake.",
          );
        } else {
          toast.warning(
            "You were removed from this space for inappropriate video. This is your only warning — a second violation will suspend your account.",
          );
        }
      } else {
        toast.info("You were removed from this space.");
      }
      clearRoomStorage();
      endVideoSession();

      void leaveSpaceRtc(parsed.roomId)
        .catch(() => {})
        .finally(() => {
          navigateAfterCallEnd(matchmaking, router);
        });
    };

    return subscribeSpaceRoomSocketEvents(socket, "participantRemoved", onRemoved);
  }, [endVideoSession, leaveSpaceRtc, matchmaking, router, socket]);

  return null;
}
