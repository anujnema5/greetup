"use client";

import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQueryClient } from "@tanstack/react-query";

import { subscribeSpaceRoomSocketEvents } from "@/features/room/lib/socket/space-room-socket-subscribe";
import { parseSpaceTitleUpdatedPayload } from "@/features/room/types/socket/space-room-socket.types";
import {
  selectSpaceRoomListenerSnapshot,
  userIsInThisSpaceSession,
} from "@/features/room/lib/session/space-room-listener";
import { patchRoomTitleInCache } from "@/features/room/lib/room-cache-sync";
import { useRoomStore } from "@/features/room/state/room.store";
import { useSocket } from "@/lib/socket";

/**
 * When the host renames a live circle, the API emits to every participant in the room.
 * Patches the cached GET `/room/:id` payload so stage title + lobby update without refresh.
 */
export function OnSpaceTitleUpdated() {
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
    const onTitleUpdated = (payload: unknown) => {
      const parsed = parseSpaceTitleUpdatedPayload(payload);
      if (!parsed) return;
      if (!userIsInThisSpaceSession(snapshotRef.current, parsed.roomId)) return;

      patchRoomTitleInCache(queryClient, parsed.roomId, parsed.title);
    };

    return subscribeSpaceRoomSocketEvents(socket, "titleUpdated", onTitleUpdated);
  }, [queryClient, socket]);

  return null;
}
