"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  selectRoomPhase,
  useRoomStore,
} from "@/features/room/state/room.store";
import { useRtcSocketContext, remotePeerIdsStableKey, remotePeerCountFromStableKey } from "@/features/rtc";
import { useMatchmaking } from "@/features/matching";
import type { MatchPartnerSkippedPayload } from "@/features/matching/hooks/match-socket-types";
import { useGetRoom } from "@/features/room/api/room.queries";
import { useSocket } from "@/lib/socket";
import { useLeaveRoom } from "@/features/room/api/room.mutations";
import { messagesDirectConversationPath } from "@/features/connection-call/lib/call-navigation";
import {
  DIRECT_CALL_NETWORK_RECOVERY_TIMEOUT_MS,
  DIRECT_CALL_RECOVERY,
  resolveConnectionCallPeerLeftDebounceMs,
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
import {
  isLocalCallEndInProgress,
  markDirectMatchPartnerSignalHandled,
  registerMatchRtcFallbackCancel,
  wasDirectMatchPartnerSignalHandled,
} from "@/features/room/lib/call/direct-match-leave-guard";

/**
 * Direct 1:1 calls: match restarts search when the peer leaves; connection calls end and
 * return to the conversation. Circle calls are unchanged — empty slots are normal when
 * friends join late.
 */
export function OnPartnerDisconnected() {
  const beginSearchingNextCall = useRoomStore((s) => s.beginSearchingNextCall);
  const endVideoSession = useRoomStore((s) => s.endVideoSession);
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const routeRoomId = resolveCircleRouteRoomId(params, pathname);
  const activeRoomId = useRoomStore(selectActiveRoomId);
  const { socket } = useSocket();
  const matchmaking = useMatchmaking();
  const matchmakingStatus = matchmaking.status;
  const waitingForPeerConnect = matchmaking.waitingForPeerConnect;
  const sessionActive = useRoomStore(selectIsVideoSessionActive);
  const roomPhase = useRoomStore(selectRoomPhase);
  const { peers, rtcRoomType } = useRtcSocketContext();
  const { mutateAsync: leaveRoom } = useLeaveRoom();

  const remotePeerKey = remotePeerIdsStableKey(Object.keys(peers));
  const remotePeerCount = remotePeerCountFromStableKey(remotePeerKey);
  const callRoomId = activeRoomId ?? resolveApiRoomId(routeRoomId);

  const remotePeerCountRef = useRef(0);

  useEffect(() => {
    remotePeerCountRef.current = remotePeerCount;
  }, [remotePeerCount]);

  const { data: roomData, isFetching: roomFetching } = useGetRoom(callRoomId ?? "", {
    enabled: Boolean(callRoomId) && sessionActive,
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
    if (isLocalCallEndInProgress()) return;
    if (roomPhase === "searching") return;
    if (handledRef.current) return;
    handledRef.current = true;
    clearPartnerLeftTimer();
    clearNetworkRecoveryTimer();
    clearSearchRetryTimer();
    beginSearchingNextCall();
    goToCircleSearch(router);
    const roomIdToLeave = activeRoomId ?? resolveApiRoomId(routeRoomId);
    const leavePromise = roomIdToLeave
      ? leaveRoom({ roomId: roomIdToLeave })
      : Promise.resolve();
    void leavePromise.catch(() => {}).finally(() => {
      void matchmaking.restartSearch();
    });
  }, [
    activeRoomId,
    clearNetworkRecoveryTimer,
    clearPartnerLeftTimer,
    clearSearchRetryTimer,
    beginSearchingNextCall,
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
    endVideoSession();
    const roomIdToLeave = activeRoomId ?? resolveApiRoomId(routeRoomId);
    const conversationId =
      roomData?.sessionKind === "connection_call" ? roomData.conversationId : undefined;
    const dest = conversationId
      ? messagesDirectConversationPath(conversationId)
      : consumeRoomReturnPath("/home");
    void matchmaking.handleCancel().catch(() => {});
    const leavePromise = roomIdToLeave
      ? leaveRoom({ roomId: roomIdToLeave })
      : Promise.resolve();
    void leavePromise.catch(() => {}).finally(() => {
      router.replace(dest);
    });
  }, [
    activeRoomId,
    clearNetworkRecoveryTimer,
    clearPartnerLeftTimer,
    clearSearchRetryTimer,
    endVideoSession,
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

    const remotePeerCountNow = remotePeerCountFromStableKey(remotePeerKey);
    if (remotePeerCountNow >= 1) {
      hadRemotePeerRef.current = true;
      handledRef.current = false;
      clearPartnerLeftTimer();
      clearNetworkRecoveryTimer();
      return;
    }

    if (!hadRemotePeerRef.current || handledRef.current) return;

    const isConnectionCall = isConnectionCallSession(roomData);
    const isMatch = isMatchSession(roomData);

    if (!isConnectionCall && !isMatch) return;

    if (timersRef.current.partnerLeft == null && timersRef.current.networkRecovery == null) {
      const debounceMs = isConnectionCall
        ? resolveConnectionCallPeerLeftDebounceMs()
        : DIRECT_CALL_RECOVERY.matchPeerLeftDebounceMs;

      registerMatchRtcFallbackCancel(clearPartnerLeftTimer);
      timersRef.current.partnerLeft = window.setTimeout(() => {
        timersRef.current.partnerLeft = null;
        if (remotePeerCountRef.current >= 1) return;
        if (isLocalCallEndInProgress()) return;
        if (!useRoomStore.getState().ui.sessionActive) return;
        if (useRoomStore.getState().session.phase === "searching") return;
        const roomIdNow =
          useRoomStore.getState().session.activeRoomId ?? resolveApiRoomId(routeRoomId);
        if (roomIdNow && wasDirectMatchPartnerSignalHandled(roomIdNow)) return;

        if (isConnectionCall) {
          if (timersRef.current.networkRecovery != null) return;
          timersRef.current.networkRecovery = window.setTimeout(() => {
            timersRef.current.networkRecovery = null;
            if (remotePeerCountRef.current >= 1) return;
            endConnectionCallAfterPeerLeft();
          }, DIRECT_CALL_NETWORK_RECOVERY_TIMEOUT_MS);
          return;
        }

        clearNetworkRecoveryTimer();
        beginSearchForNextCandidate();
      }, debounceMs);
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
    const onPartnerSkipped = (data: MatchPartnerSkippedPayload) => {
      if (isLocalCallEndInProgress()) return;
      if (!sessionActive || roomPhase === "searching" || handledRef.current) return;
      const ourRoomId = activeRoomId ?? resolveApiRoomId(routeRoomId);
      if (!data?.roomId || !ourRoomId || data.roomId !== ourRoomId) return;
      if (!markDirectMatchPartnerSignalHandled(data.roomId)) return;
      beginSearchForNextCandidate();
    };

    socket.on("match:partner_skipped", onPartnerSkipped);
    return () => {
      socket.off("match:partner_skipped", onPartnerSkipped);
    };
  }, [
    activeRoomId,
    beginSearchForNextCandidate,
    routeRoomId,
    roomPhase,
    sessionActive,
    socket,
  ]);

  useEffect(() => {
    if (!sessionActive || roomPhase !== "searching") {
      clearSearchRetryTimer();
      return;
    }
    if (isLocalCallEndInProgress()) {
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
