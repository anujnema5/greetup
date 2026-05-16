"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRoomPhase,
} from "@/lib/redux/selectors/room-selectors";
import { beginSearchingNextCall } from "@/lib/redux/slices/room-slice";
import { useRtcSocketContext, remotePeerIdsStableKey, remotePeerCountFromStableKey } from "@/features/rtc";
import { useMatchmaking } from "@/features/matching";
import { useLeaveRoomMutation } from "@/features/room/api/room-api";
import { DIRECT_CALL_RECOVERY } from "@/features/room/constants/direct-call/direct-call-recovery";
import {
  goToCircleSearch,
  resolveApiRoomId,
  resolveCircleRouteRoomId,
} from "@/features/room/lib/navigation/circle-routes";

/**
 * Direct (1:1 match) calls only: when the other peer leaves, keep the user on the in-call UI,
 * mark the room as "searching", leave the stale room on the API, and restart matchmaking.
 * Circle / `db_room` calls are unchanged — empty slots are normal when friends join late.
 */
export function OnPartnerDisconnected() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const routeRoomId = resolveCircleRouteRoomId(params, pathname);
  const activeRoomId = useAppSelector(selectActiveRoomId);
  const matchmaking = useMatchmaking();
  const matchmakingStatus = matchmaking.status;
  const waitingForPeerConnect = matchmaking.waitingForPeerConnect;
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const roomPhase = useAppSelector(selectRoomPhase);
  const { peers, mediasoupStatus, rtcSocketState, rtcRoomType } = useRtcSocketContext();
  const [leaveRoom] = useLeaveRoomMutation();

  const remotePeerKey = remotePeerIdsStableKey(Object.keys(peers));
  const callRoomId = activeRoomId ?? resolveApiRoomId(routeRoomId);

  const hadRemotePeerRef = useRef(false);
  const handledRef = useRef(false);
  const trackedCallRoomIdRef = useRef<string | null>(null);
  const timersRef = useRef({
    partnerLeft: null as number | null,
    networkRecovery: null as number | null,
    searchRetry: null as number | null,
  });

  const clearPartnerLeftTimer = useCallback(() => {
    if (timersRef.current.partnerLeft != null) {
      window.clearTimeout(timersRef.current.partnerLeft);
      timersRef.current.partnerLeft = null;
    }
  }, []);

  const clearNetworkRecoveryTimer = useCallback(() => {
    if (timersRef.current.networkRecovery != null) {
      window.clearTimeout(timersRef.current.networkRecovery);
      timersRef.current.networkRecovery = null;
    }
  }, []);

  const clearSearchRetryTimer = useCallback(() => {
    if (timersRef.current.searchRetry != null) {
      window.clearTimeout(timersRef.current.searchRetry);
      timersRef.current.searchRetry = null;
    }
  }, []);

  const beginSearchForNextCandidate = useCallback(() => {
    if (roomPhase === "searching") return;
    if (handledRef.current) return;
    handledRef.current = true;
    clearPartnerLeftTimer();
    clearNetworkRecoveryTimer();
    clearSearchRetryTimer();
    dispatch(beginSearchingNextCall());
    goToCircleSearch(router);
    const roomIdToLeave = activeRoomId ?? resolveApiRoomId(routeRoomId);
    const leavePromise = roomIdToLeave
      ? leaveRoom({ roomId: roomIdToLeave }).unwrap()
      : Promise.resolve();
    void leavePromise.catch(() => {}).finally(() => {
      void matchmaking.restartSearch();
    });
  }, [
    activeRoomId,
    clearNetworkRecoveryTimer,
    clearPartnerLeftTimer,
    clearSearchRetryTimer,
    dispatch,
    leaveRoom,
    matchmaking,
    roomPhase,
    routeRoomId,
    router,
  ]);

  useEffect(() => {
    if (!sessionActive) {
      hadRemotePeerRef.current = false;
      handledRef.current = false;
      trackedCallRoomIdRef.current = null;
      clearPartnerLeftTimer();
      clearNetworkRecoveryTimer();
      clearSearchRetryTimer();
    }
  }, [clearNetworkRecoveryTimer, clearPartnerLeftTimer, clearSearchRetryTimer, sessionActive]);

  useEffect(() => {
    if (trackedCallRoomIdRef.current === callRoomId) return;
    trackedCallRoomIdRef.current = callRoomId;
    hadRemotePeerRef.current = false;
    handledRef.current = false;
    clearPartnerLeftTimer();
    clearNetworkRecoveryTimer();
  }, [callRoomId, clearNetworkRecoveryTimer, clearPartnerLeftTimer]);

  useEffect(() => {
    if (!sessionActive) return;
    if (rtcRoomType === "circle") return;
    if (roomPhase === "searching") return;
    if (matchmakingStatus === "proposed" || waitingForPeerConnect) {
      clearPartnerLeftTimer();
      clearNetworkRecoveryTimer();
      return;
    }

    const remotePeerCount = remotePeerCountFromStableKey(remotePeerKey);
    if (remotePeerCount >= 1) {
      hadRemotePeerRef.current = true;
      handledRef.current = false;
      clearPartnerLeftTimer();
      clearNetworkRecoveryTimer();
      return;
    }

    if (!hadRemotePeerRef.current || handledRef.current) return;

    const connectionRecovering = rtcSocketState !== "connected" || mediasoupStatus !== "ready";
    if (connectionRecovering) {
      clearPartnerLeftTimer();
      if (timersRef.current.networkRecovery == null) {
        timersRef.current.networkRecovery = window.setTimeout(() => {
          timersRef.current.networkRecovery = null;
          beginSearchForNextCandidate();
        }, DIRECT_CALL_RECOVERY.networkRecoveryTimeoutMs);
      }
      return;
    }

    clearNetworkRecoveryTimer();
    beginSearchForNextCandidate();

    return () => {
      clearPartnerLeftTimer();
    };
  }, [
    sessionActive,
    rtcRoomType,
    mediasoupStatus,
    rtcSocketState,
    remotePeerKey,
    matchmakingStatus,
    waitingForPeerConnect,
    roomPhase,
    dispatch,
    clearNetworkRecoveryTimer,
    clearPartnerLeftTimer,
    beginSearchForNextCandidate,
  ]);

  useEffect(() => {
    if (!sessionActive || roomPhase !== "searching") {
      clearSearchRetryTimer();
      return;
    }
    if (
      matchmakingStatus === "searching" ||
      matchmakingStatus === "proposed" ||
      matchmakingStatus === "error"
    ) {
      clearSearchRetryTimer();
      return;
    }
    if (timersRef.current.searchRetry != null) return;
    timersRef.current.searchRetry = window.setTimeout(() => {
      timersRef.current.searchRetry = null;
      matchmaking.handleFindMatch();
    }, DIRECT_CALL_RECOVERY.searchRetryDelayMs);
    return () => {
      clearSearchRetryTimer();
    };
  }, [clearSearchRetryTimer, matchmaking, matchmakingStatus, roomPhase, sessionActive]);

  useEffect(
    () => () => {
      clearPartnerLeftTimer();
      clearNetworkRecoveryTimer();
      clearSearchRetryTimer();
    },
    [clearNetworkRecoveryTimer, clearPartnerLeftTimer, clearSearchRetryTimer],
  );

  return null;
}
