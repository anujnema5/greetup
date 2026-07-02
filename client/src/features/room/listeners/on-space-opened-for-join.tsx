"use client";

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";

import {
  selectSpaceRoomListenerSnapshot,
  userIsInThisSpaceSession,
  userIsWaitingToJoinRtc,
} from "@/features/room/lib/session/space-room-listener";
import { patchRoomOpenedForJoinInCache } from "@/features/room/lib/room-cache-sync";
import { subscribeSpaceRoomSocketEvents } from "@/features/room/lib/socket/space-room-socket-subscribe";
import { parseSpaceOpenedForJoinPayload } from "@/features/room/types/socket/space-room-socket.types";
import { invalidateRtcTokenCache } from "@/features/rtc/lib/rtc-token-cache";
import { useRoomStore } from "@/features/room/state/room.store";
import { useSocket } from "@/lib/socket";

/**
 * When the host opens the circle (or it goes live without a host lobby gate), guests waiting in
 * the pre-join lobby refetch their RTC token immediately instead of waiting for the poll interval.
 */
export function OnSpaceOpenedForJoin() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const roomSnapshot = useRoomStore(
    useShallow((s) => selectSpaceRoomListenerSnapshot(s)),
  );
  const snapshotRef = useRef(roomSnapshot);

  useEffect(() => {
    snapshotRef.current = roomSnapshot;
  }, [roomSnapshot]);

  useEffect(() => {
    const onOpenedForJoin = (payload: unknown) => {
      const parsed = parseSpaceOpenedForJoinPayload(payload);
      if (!parsed) return;

      const snap = snapshotRef.current;
      if (!userIsInThisSpaceSession(snap, parsed.roomId)) return;
      if (!userIsWaitingToJoinRtc(snap)) return;

      patchRoomOpenedForJoinInCache(queryClient, parsed.roomId);
      invalidateRtcTokenCache(parsed.roomId, queryClient);
    };

    return subscribeSpaceRoomSocketEvents(socket, "openedForJoin", onOpenedForJoin);
  }, [queryClient, socket]);

  return null;
}
