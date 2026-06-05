"use client";

import { useEffect, useRef } from "react";
import { shallowEqual } from "react-redux";

import { roomApi } from "@/features/room/api/room-api";
import {
  selectCircleRoomListenerSnapshot,
  userIsInThisCircleSession,
  userIsWaitingToJoinRtc,
} from "@/features/room/lib/session/circle-room-listener";
import { patchCachedRoomOpenedForJoin } from "@/features/room/lib/session/room-rtk-cache";
import {
  CIRCLE_ROOM_SOCKET_EVENTS,
  parseCircleOpenedForJoinPayload,
} from "@/features/room/types/socket/circle-room-socket.types";
import { rtcApi, rtcTokenCacheTag } from "@/features/rtc/api/rtc-api";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useSocket } from "@/lib/socket";

/**
 * When the host opens the circle (or it goes live without a host lobby gate), guests waiting in
 * the pre-join lobby refetch their RTC token immediately instead of waiting for the poll interval.
 */
export function OnCircleOpenedForJoin() {
  const { socket } = useSocket();
  const dispatch = useAppDispatch();

  const roomSnapshot = useAppSelector(selectCircleRoomListenerSnapshot, shallowEqual);
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

      dispatch(
        roomApi.util.updateQueryData("getRoom", parsed.roomId, (draft) => {
          if (!draft) return;
          patchCachedRoomOpenedForJoin(draft);
        }),
      );
      dispatch(rtcApi.util.invalidateTags([rtcTokenCacheTag(parsed.roomId)]));
    };

    socket.on(event, onOpenedForJoin);
    return () => {
      socket.off(event, onOpenedForJoin);
    };
  }, [dispatch, socket]);

  return null;
}
