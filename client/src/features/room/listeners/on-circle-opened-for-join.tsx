"use client";

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";

import {
  selectCircleRoomListenerSnapshot,
  userIsInThisCircleSession,
  userIsWaitingToJoinRtc,
} from "@/features/room/lib/session/circle-room-listener";
import { patchRoomOpenedForJoinInCache } from "@/features/room/lib/room-cache-sync";
import {
  CIRCLE_ROOM_SOCKET_EVENTS,
  parseCircleOpenedForJoinPayload,
} from "@/features/room/types/socket/circle-room-socket.types";
import { invalidateRtcTokenCache } from "@/features/rtc/lib/rtc-token-cache";
import { useRoomStore } from "@/features/room/state/room.store";
import { useSocket } from "@/lib/socket";

/**
 * When the host opens the circle (or it goes live without a host lobby gate), guests waiting in
 * the pre-join lobby refetch their RTC token immediately instead of waiting for the poll interval.
 */
export function OnCircleOpenedForJoin() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const roomSnapshot = useRoomStore(
    useShallow((s) => selectCircleRoomListenerSnapshot(s)),
  );
  const snapshotRef = useRef(roomSnapshot);

  useEffect(() => {
    snapshotRef.current = roomSnapshot;
  }, [roomSnapshot]);

  useEffect(() => {
    const event = CIRCLE_ROOM_SOCKET_EVENTS.openedForJoin;

    const onOpenedForJoin = (payload: unknown) => {
      const parsed = parseCircleOpenedForJoinPayload(payload);
      if (!parsed) return;

      const snap = snapshotRef.current;
      if (!userIsInThisCircleSession(snap, parsed.roomId)) return;
      if (!userIsWaitingToJoinRtc(snap)) return;

      patchRoomOpenedForJoinInCache(queryClient, parsed.roomId);
      invalidateRtcTokenCache(parsed.roomId, queryClient);
    };

    socket.on(event, onOpenedForJoin);
    return () => {
      socket.off(event, onOpenedForJoin);
    };
  }, [queryClient, socket]);

  return null;
}
