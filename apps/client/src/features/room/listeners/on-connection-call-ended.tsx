"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  selectActiveRoomId,
  selectIsVideoSessionActive,
  useRoomStore,
} from "@/features/room/state/room.store";
import {
  CONNECTION_CALL_SOCKET_EVENTS,
  parseConnectionCallEndedPayload,
} from "@/features/connection-call/types/connection-call-socket.types";
import { messagesDirectConversationPath } from "@/features/connection-call/lib/call-navigation";
import { useMatchmaking } from "@/features/matching";
import { useLeaveRoom } from "@/features/room/api/room.mutations";
import { resolveApiRoomId, resolveSpaceRouteRoomId } from "@/features/room/lib/navigation/space-routes";
import { consumeRoomReturnPath } from "@/features/room/lib/session/room-return-path";
import { clearRoomStorage } from "@/features/room/lib/session/room-sync";
import { isLocalCallEndInProgress } from "@/features/room/lib/call/direct-match-leave-guard";
import { useSocket } from "@/lib/socket";

/**
 * When one participant hangs up a connection (DM) call, the API notifies the remaining peer
 * immediately instead of waiting for RTC peer-drop debounce.
 */
export function OnConnectionCallEnded() {
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

  const endCallForRemotePeer = useCallback(
    (conversationId: string | undefined) => {
      if (handledRef.current) return;
      handledRef.current = true;
      clearRoomStorage();
      endVideoSession();
      const roomIdToLeave = activeRoomId ?? resolveApiRoomId(routeRoomId);
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
    },
    [activeRoomId, endVideoSession, leaveRoom, matchmaking, routeRoomId, router],
  );

  useEffect(() => {
    if (!sessionActive) {
      handledRef.current = false;
    }
  }, [sessionActive]);

  useEffect(() => {
    const onConnectionCallEnded = (payload: unknown) => {
      if (isLocalCallEndInProgress()) return;
      if (!sessionActive || handledRef.current) return;

      const parsed = parseConnectionCallEndedPayload(payload);
      if (!parsed) return;

      const ourRoomId = activeRoomId ?? resolveApiRoomId(routeRoomId);
      if (!ourRoomId || parsed.roomId !== ourRoomId) return;

      endCallForRemotePeer(parsed.conversationId || undefined);
    };

    socket.on(CONNECTION_CALL_SOCKET_EVENTS.ended, onConnectionCallEnded);
    return () => {
      socket.off(CONNECTION_CALL_SOCKET_EVENTS.ended, onConnectionCallEnded);
    };
  }, [activeRoomId, endCallForRemotePeer, routeRoomId, sessionActive, socket]);

  return null;
}
