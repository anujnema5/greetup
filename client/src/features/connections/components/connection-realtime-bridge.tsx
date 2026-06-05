"use client";

import { useEffect } from "react";
import {
  syncConnectionFromSocket,
  type ConnectionUpdatedSocketPayload,
} from "@/features/connections/lib/realtime";
import { useAppDispatch } from "@/lib/redux/hooks";
import { useSocket } from "@/lib/socket";

/** Listens for `connection:updated` and syncs peer preview + connection lists. */
export function ConnectionRealtimeBridge() {
  const dispatch = useAppDispatch();
  const { socket } = useSocket();

  useEffect(() => {
    const onConnectionUpdated = (payload?: ConnectionUpdatedSocketPayload) => {
      syncConnectionFromSocket(dispatch, payload);
    };

    socket.on("connection:updated", onConnectionUpdated);
    return () => {
      socket.off("connection:updated", onConnectionUpdated);
    };
  }, [dispatch, socket]);

  return null;
}
