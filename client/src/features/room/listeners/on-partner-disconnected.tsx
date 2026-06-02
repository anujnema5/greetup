"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRoomPhase,
} from "@/lib/redux/selectors/room-selectors";
import { beginSearchingNextCall, endVideoSession } from "@/lib/redux/slices/room-slice";
import { useRtcSocketContext, remotePeerIdsStableKey, remotePeerCountFromStableKey } from "@/features/rtc";
import { useMatchmaking } from "@/features/matching";
import { useGetRoomQuery, useLeaveRoomMutation } from "@/features/room/api/room-api";
import { messagesDirectConversationPath } from "@/features/connection-call/lib/call-navigation";
import {
  DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS,
  DIRECT_CALL_RECOVERY,
} from "@/features/room/constants/direct-call/direct-call-recovery";
import {
  goToCircleSearch,
  resolveApiRoomId,
  resolveCircleRouteRoomId,
} from "@/features/room/lib/navigation/circle-routes";
import { consumeRoomReturnPath } from "@/features/room/lib/session/room-return-path";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import {
  isCircleSession,
  isConnectionCallSession,
  isMatchSession,
} from "@/features/room/lib/session/room-session-kind";

/**
 * Direct 1:1 calls: match restarts search when the peer leaves; connection calls end and
 * return to the conversation. Circle calls are unchanged — empty slots are normal when
 * friends join late.
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
  const { peers, rtcRoomType } = useRtcSocketContext();
  const [leaveRoom] = useLeaveRoomMutation();

  const remotePeerKey = remotePeerIdsStableKey(Object.keys(peers));
  const callRoomId = activeRoomId ?? resolveApiRoomId(routeRoomId);

  const { data: roomData, isFetching: roomFetching } = useGetRoomQuery(callRoomId ?? "", {
    skip: !callRoomId || !sessionActive,
  });

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

  const endConnectionCallAfterPeerLeft = useCallback(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    clearPartnerLeftTimer();
    clearNetworkRecoveryTimer();
    clearSearchRetryTimer();
    clearRoomStorage();
    dispatch(endVideoSession());
    const roomIdToLeave = activeRoomId ?? resolveApiRoomId(routeRoomId);
    const conversationId =
      roomData?.sessionKind === "connection_call" ? roomData.conversationId : undefined;
    const dest = conversationId
      ? messagesDirectConversationPath(conversationId)
      : consumeRoomReturnPath("/home");
    void matchmaking.handleCancel().catch(() => {});
    const leavePromise = roomIdToLeave
      ? leaveRoom({ roomId: roomIdToLeave }).unwrap()
      : Promise.resolve();
    void leavePromise.catch(() => {}).finally(() => {
      router.replace(dest);
    });
  }, [
    activeRoomId,
    clearNetworkRecoveryTimer,
    clearPartnerLeftTimer,
    clearSearchRetryTimer,
    dispatch,
    leaveRoom,
    matchmaking,
    roomData,
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
    if (rtcRoomType === "circle" || isCircleSession(roomData)) return;
    if (callRoomId && roomFetching && !roomData) return;
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

    const onPeerLeft = isConnectionCallSession(roomData)
      ? endConnectionCallAfterPeerLeft
      : isMatchSession(roomData)
        ? beginSearchForNextCandidate
        : null;

    if (!onPeerLeft) return;

    if (timersRef.current.partnerLeft == null) {
      timersRef.current.partnerLeft = window.setTimeout(() => {
        timersRef.current.partnerLeft = null;
        clearNetworkRecoveryTimer();
        onPeerLeft();
      }, DIRECT_CALL_PEER_LEFT_DEBOUNCE_MS);
    }

    return () => {
      clearPartnerLeftTimer();
    };
  }, [
    sessionActive,
    rtcRoomType,
    roomData,
    roomFetching,
    callRoomId,
    remotePeerKey,
    matchmakingStatus,
    waitingForPeerConnect,
    roomPhase,
    clearNetworkRecoveryTimer,
    clearPartnerLeftTimer,
    beginSearchForNextCandidate,
    endConnectionCallAfterPeerLeft,
  ]);

  useEffect(() => {
    if (!sessionActive || roomPhase !== "searching") {
      clearSearchRetryTimer();
      return;
    }
    if (isConnectionCallSession(roomData) || isCircleSession(roomData)) {
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
  }, [clearSearchRetryTimer, matchmaking, matchmakingStatus, roomData, roomPhase, sessionActive]);

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
