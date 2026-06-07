"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  syncConnectionFromSocket,
  type ConnectionUpdatedSocketPayload,
} from "@/features/connections/lib/realtime";
import { useSocket } from "@/lib/socket";

/** Listens for `connection:updated` and syncs peer preview + connection lists. */
export function ConnectionRealtimeBridge() {
  const qc = useQueryClient();
  const { socket } = useSocket();

  useEffect(() => {
    const onConnectionUpdated = (payload?: ConnectionUpdatedSocketPayload) => {
      syncConnectionFromSocket(qc, payload);
    };

    socket.on("connection:updated", onConnectionUpdated);
    return () => {
      socket.off("connection:updated", onConnectionUpdated);
    };
  }, [qc, socket]);

  return null;
}
