"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectIsVideoSessionActive,
  selectRoomPhase,
} from "@/lib/redux/selectors/room-selectors";
import { beginSearchingNextCall, setRoomPhase } from "@/lib/redux/slices/roomSlice";
import { useRtcSocketContext, remotePeerIdsStableKey, remotePeerCountFromStableKey } from "@/features/rtc";
import { useMatchmaking } from "@/features/matching";
import { useLeaveRoomMutation } from "@/features/room/api/room-api";
import { DIRECT_CALL_RECOVERY } from "@/features/room/constants/direct-call-recovery";

/**
 * Direct (1:1 match) calls only: when the other peer leaves, keep the user on the in-call UI,
 * mark the room as "searching", leave the stale room on the API, and restart matchmaking.
 * Circle / `db_room` calls are unchanged — empty slots are normal when friends join late.
 */
export function DirectCallPartnerDisconnectHandler() {
  const dispatch = useAppDispatch();
  const matchmaking = useMatchmaking();
  const matchmakingStatus = matchmaking.status;
  const sessionActive = useAppSelector(selectIsVideoSessionActive);
  const roomPhase = useAppSelector(selectRoomPhase);
  const { peers, mediasoupStatus, rtcSocketState, rtcRoomType } = useRtcSocketContext();
  const [leaveRoom] = useLeaveRoomMutation();

  const remotePeerKey = remotePeerIdsStableKey(Object.keys(peers));

  const hadRemotePeerRef = useRef(false);
  const handledRef = useRef(false);
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
    if (handledRef.current) return;
    handledRef.current = true;
    clearPartnerLeftTimer();
    clearNetworkRecoveryTimer();
    clearSearchRetryTimer();
    dispatch(beginSearchingNextCall());
    void leaveRoom()
      .unwrap()
      .catch(() => {})
      .finally(() => {
        void matchmaking.restartSearch();
      });
  }, [
    clearNetworkRecoveryTimer,
    clearPartnerLeftTimer,
    clearSearchRetryTimer,
    dispatch,
    leaveRoom,
    matchmaking,
  ]);

  useEffect(() => {
    if (!sessionActive) {
      hadRemotePeerRef.current = false;
      handledRef.current = false;
      clearPartnerLeftTimer();
      clearNetworkRecoveryTimer();
      clearSearchRetryTimer();
    }
  }, [clearNetworkRecoveryTimer, clearPartnerLeftTimer, clearSearchRetryTimer, sessionActive]);

  useEffect(() => {
    if (!sessionActive) return;
    if (rtcRoomType === "circle") return;

    const remotePeerCount = remotePeerCountFromStableKey(remotePeerKey);
    if (remotePeerCount >= 1) {
      hadRemotePeerRef.current = true;
      handledRef.current = false;
      clearPartnerLeftTimer();
      clearNetworkRecoveryTimer();
      const replacementReady = matchmakingStatus === "matched" || matchmakingStatus === "proposed";
      if (roomPhase === "searching" && replacementReady) {
        dispatch(setRoomPhase("in_call"));
      }
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
    if (timersRef.current.partnerLeft == null) {
      timersRef.current.partnerLeft = window.setTimeout(() => {
        timersRef.current.partnerLeft = null;
        beginSearchForNextCandidate();
      }, DIRECT_CALL_RECOVERY.peerLeftDebounceMs);
    }

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
    if (matchmakingStatus === "searching" || matchmakingStatus === "proposed") {
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
