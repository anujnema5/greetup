"use client";

import { createContext, useContext } from "react";
import type { RtcSocketContextValue } from "@/features/rtc/types/rtc-socket-context.types";
import type { MediasoupRoomStatus } from "@/features/rtc/types/mediasoup-room.types";

export const RtcSocketContext = createContext<RtcSocketContextValue | null>(null);

export function mapMediasoupToSliceStatus(
  sessionActive: boolean,
  ms: MediasoupRoomStatus,
): "idle" | "connecting" | "connected" | "error" {
  if (!sessionActive) return "idle";
  switch (ms) {
    case "ready":
      return "connected";
    case "error":
      return "error";
    case "joining":
    case "negotiating":
    case "connecting_socket":
      return "connecting";
    default:
      return "idle";
  }
}

export function useRtcSocketContext(): RtcSocketContextValue {
  const ctx = useContext(RtcSocketContext);
  if (!ctx) {
    throw new Error("useRtcSocketContext must be used within RtcSocketProvider");
  }
  return ctx;
}
