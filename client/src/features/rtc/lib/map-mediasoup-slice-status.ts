import type { MediasoupRoomStatus } from "../types/mediasoup-room.types";

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
