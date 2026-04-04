"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
} from "@/lib/redux/selectors/room-selectors";
import { endVideoSession } from "@/lib/redux/slices/roomSlice";
import { useRtcSocketContext, remotePeerIdsStableKey, remotePeerCountFromStableKey } from "@/features/rtc";
import { useGetRoomQuery, useLeaveRoomMutation, isCircleRoomData } from "@/features/matching";
import { clearRoomStorage } from "@/features/room/lib/room-sync";
import {
  DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS,
  MATCHMAKING_HUB_PATH,
} from "@/features/room/constants/call-flow";

/**
 * Direct (1:1 match) calls only: when the other peer leaves the rtc-service room, end the session,
 * leave the match room on the API, and send the user back to Explore to search again.
 * Circle / `db_room` calls are unchanged — empty slots are normal when friends join late.
 */
export function DirectCallPartnerDisconnectHandler() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const { peers, mediasoupStatus } = useRtcSocketContext();
  const [leaveRoom] = useLeaveRoomMutation();

  const remotePeerKey = remotePeerIdsStableKey(Object.keys(peers));

  const { data: room, isSuccess: roomLoaded } = useGetRoomQuery(activeRoomId ?? "", {
    skip: !activeRoomId || !sessionActive,
  });

  const hadRemotePeerRef = useRef(false);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!sessionActive) {
      hadRemotePeerRef.current = false;
      handledRef.current = false;
    }
  }, [sessionActive]);

  useEffect(() => {
    if (!sessionActive || !roomLoaded || !room) return;
    if (isCircleRoomData(room)) return;
    if (mediasoupStatus !== "ready") return;

    const n = remotePeerCountFromStableKey(remotePeerKey);
    if (n >= 1) {
      hadRemotePeerRef.current = true;
      return;
    }

    if (!hadRemotePeerRef.current || handledRef.current) return;

    const t = window.setTimeout(() => {
      handledRef.current = true;
      toast.info("Your match left", { description: "Heading back to search." });
      clearRoomStorage();
      dispatch(endVideoSession());
      void leaveRoom()
        .unwrap()
        .catch(() => {});
      router.replace(MATCHMAKING_HUB_PATH);
    }, DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [
    sessionActive,
    roomLoaded,
    room,
    mediasoupStatus,
    remotePeerKey,
    dispatch,
    leaveRoom,
    router,
  ]);

  return null;
}
