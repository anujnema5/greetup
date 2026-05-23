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
import {
  selectCircleRoomListenerSnapshot,
  userIsInThisCircleSession,
} from "@/features/room/lib/session/circle-room-listener";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { endVideoSession } from "@/lib/redux/slices/room-slice";
import { useSocket } from "@/lib/socket";

/**
 * When the host removes a participant, they receive this event and should leave RTC + UI.
 */
export function OnParticipantRemovedFromCircle() {
  const { socket } = useSocket();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const matchmaking = useMatchmaking();
  const [leaveCircleRtc] = useLeaveCircleRtcMutation();

  const roomSnapshot = useAppSelector(selectCircleRoomListenerSnapshot, shallowEqual);
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

      if (parsed.reason === "nsfw") {
        if (parsed.strikeCount != null && parsed.strikeCount >= 2) {
          toast.error(
            "Your account was suspended for repeated inappropriate video. Contact support if you believe this is a mistake.",
          );
        } else {
          toast.warning(
            "You were removed from this circle for inappropriate video. This is your only warning — a second violation will suspend your account.",
          );
        }
      } else {
        toast.info("You were removed from this circle.");
      }
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
