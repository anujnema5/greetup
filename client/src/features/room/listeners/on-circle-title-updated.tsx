"use client";

import { useEffect, useRef } from "react";
import { shallowEqual } from "react-redux";

import { roomApi } from "@/features/room/api/room-api";
import type { RoomData } from "@/features/matching/types/room.types";
import {
  CIRCLE_ROOM_SOCKET_EVENTS,
  parseCircleTitleUpdatedPayload,
} from "@/features/room/types/socket/circle-room-socket.types";
import {
  selectCircleRoomListenerSnapshot,
  userIsInThisCircleSession,
} from "@/features/room/lib/session/circle-room-listener";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useSocket } from "@/lib/socket";

function applyTitleToRoomDraft(draft: RoomData, title: string): void {
  if (draft.sessionKind === "db_room") {
    draft.title = title;
    return;
  }
  if ("title" in draft) {
    draft.title = title;
  }
}

/**
 * When the host renames a live circle, the API emits to every participant in the room.
 * Patches the cached GET `/room/:id` payload so stage title + lobby update without refresh.
 */
export function OnCircleTitleUpdated() {
  const { socket } = useSocket();
  const dispatch = useAppDispatch();

  const roomSnapshot = useAppSelector(selectCircleRoomListenerSnapshot, shallowEqual);
  const snapshotRef = useRef(roomSnapshot);

  useEffect(() => {
    snapshotRef.current = roomSnapshot;
  }, [roomSnapshot]);

  useEffect(() => {
    const event = CIRCLE_ROOM_SOCKET_EVENTS.titleUpdated;

    const onTitleUpdated = (payload: unknown) => {
      const parsed = parseCircleTitleUpdatedPayload(payload);
      if (!parsed) return;
      if (!userIsInThisCircleSession(snapshotRef.current, parsed.roomId)) return;

      dispatch(
        roomApi.util.updateQueryData("getRoom", parsed.roomId, (draft) => {
          if (!draft) return;
          applyTitleToRoomDraft(draft, parsed.title);
        }),
      );
    };

    socket.on(event, onTitleUpdated);
    return () => {
      socket.off(event, onTitleUpdated);
    };
  }, [dispatch, socket]);

  return null;
}
