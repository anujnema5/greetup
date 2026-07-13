"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { queryKeys } from "@/lib/query/keys";
import { useSocket } from "@/lib/socket";

import { TRY_SOCKET_EVENTS, type TryConsumedSocketPayload } from "../constants/try-socket-events";
import { markTryConsumedLocally } from "../lib/try-navigation";

/** Syncs try status when the server emits `guest:trial_consumed`. */
export function useTrySocket() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onTryConsumed = (_payload: TryConsumedSocketPayload) => {
      markTryConsumedLocally();
      void queryClient.invalidateQueries({ queryKey: queryKeys.guestTry.status });
    };

    socket.on(TRY_SOCKET_EVENTS.tryConsumed, onTryConsumed);
    return () => {
      socket.off(TRY_SOCKET_EVENTS.tryConsumed, onTryConsumed);
    };
  }, [socket, queryClient]);
}
