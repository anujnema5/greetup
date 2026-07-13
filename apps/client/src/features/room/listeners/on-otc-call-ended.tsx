"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  useRoomStore,
} from "@/features/room/state/room.store";
import {
  OTC_CALL_SOCKET_EVENTS,
  parseOtcCallEndedPayload,
} from "@/features/open-to-connect/types/open-to-connect-socket.types";
import { endOtcCallForPeer } from "@/features/open-to-connect/lib/end-otc-call";
import { useMatchmaking } from "@/features/matching";
import { useLeaveRoom } from "@/features/room/api/room.mutations";
import { resolveApiRoomId, resolveSpaceRouteRoomId } from "@/features/room/lib/navigation/space-routes";
import {
  isLocalCallEndInProgress,
  markDirectMatchPartnerSignalHandled,
} from "@/features/room/lib/call/direct-match-leave-guard";
import { useSocket } from "@/lib/socket";

/**
 * When one participant hangs up an open-to-connect call, notify the remaining peer
 * immediately instead of restarting match search.
 */
export function OnOtcCallEnded() {
  const endVideoSession = useRoomStore((s) => s.endVideoSession);
  const activeRoomId = useRoomStore(selectActiveRoomId);
  const sessionActive = useRoomStore(selectIsVideoSessionActive);
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const routeRoomId = resolveSpaceRouteRoomId(params, pathname);
  const { socket } = useSocket();
  const matchmaking = useMatchmaking();
  const { mutateAsync: leaveRoom } = useLeaveRoom();
  const handledRef = useRef(false);

  const endCallForRemotePeer = useCallback(() => {
    endOtcCallForPeer({
      reason: "peer_ended",
      roomIdToLeave: activeRoomId ?? resolveApiRoomId(routeRoomId),
      endVideoSession,
      leaveRoom,
      matchmaking,
      router,
      handledRef,
    });
  }, [activeRoomId, endVideoSession, leaveRoom, matchmaking, routeRoomId, router]);

  useEffect(() => {
    if (!sessionActive) {
      handledRef.current = false;
    }
  }, [sessionActive]);

  useEffect(() => {
    const onOtcCallEnded = (payload: unknown) => {
      if (isLocalCallEndInProgress()) return;
      if (!sessionActive || handledRef.current) return;

      const parsed = parseOtcCallEndedPayload(payload);
      if (!parsed) return;

      const ourRoomId = activeRoomId ?? resolveApiRoomId(routeRoomId);
      if (!ourRoomId || parsed.roomId !== ourRoomId) return;
      if (!markDirectMatchPartnerSignalHandled(parsed.roomId)) return;

      endCallForRemotePeer();
    };

    socket.on(OTC_CALL_SOCKET_EVENTS.ended, onOtcCallEnded);
    return () => {
      socket.off(OTC_CALL_SOCKET_EVENTS.ended, onOtcCallEnded);
    };
  }, [activeRoomId, endCallForRemotePeer, routeRoomId, sessionActive, socket]);

  return null;
}
