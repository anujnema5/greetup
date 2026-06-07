"use client";

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";

import {
  CIRCLE_ROOM_SOCKET_EVENTS,
  parseCircleTitleUpdatedPayload,
} from "@/features/room/types/socket/circle-room-socket.types";
import {
  selectCircleRoomListenerSnapshot,
  userIsInThisCircleSession,
} from "@/features/room/lib/session/circle-room-listener";
import { patchRoomTitleInCache } from "@/features/room/lib/room-cache-sync";
import { useRoomStore } from "@/features/room/state/room.store";
import { useSocket } from "@/lib/socket";

/**
 * When the host renames a live circle, the API emits to every participant in the room.
 * Patches the cached GET `/room/:id` payload so stage title + lobby update without refresh.
 */
export function OnCircleTitleUpdated() {
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
    const event = CIRCLE_ROOM_SOCKET_EVENTS.titleUpdated;

    const onTitleUpdated = (payload: unknown) => {
      const parsed = parseCircleTitleUpdatedPayload(payload);
      if (!parsed) return;
      if (!userIsInThisCircleSession(snapshotRef.current, parsed.roomId)) return;

      patchRoomTitleInCache(queryClient, parsed.roomId, parsed.title);
    };

    socket.on(event, onTitleUpdated);
    return () => {
      socket.off(event, onTitleUpdated);
    };
  }, [queryClient, socket]);

  return null;
}
