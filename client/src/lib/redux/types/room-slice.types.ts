/**
 * Global room / realtime session model (client-only).
 * Server truth stays in RTK Query; this slice holds session UI + WebRTC peer bookkeeping.
 *
 * Synchronized in-call activities live in `roomActivity` slice (`activity-slice.types.ts`).
 */

export type { RoomActiveActivity, RoomChessActivityState, RoomChessLastOutcome } from "./activity-slice.types";

export type RoomSessionPhase = "idle" | "lobby" | "in_call" | "searching";

/** Per-peer metadata — extend for streams, screenshare, connection quality, etc. */
export type RoomPeerEntry = {
  userId: string;
};

/**
 * Serializable mediasoup phase (actual `MediaStream`s live in `RtcSocketProvider` context only).
 */
export type RoomMediaStatus = "idle" | "connecting" | "connected" | "error";
