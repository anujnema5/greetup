/**
 * Global room / realtime session model (client-only).
 * Server truth stays in RTK Query; this slice holds UI + future WebRTC / games / chat.
 */

export type RoomSessionPhase = "idle" | "lobby" | "in_call" | "searching";

/** Per-peer metadata — extend for streams, screenshare, connection quality, etc. */
export type RoomPeerEntry = {
  userId: string;
};

/**
 * Serializable mediasoup phase (actual `MediaStream`s live in `RtcSocketProvider` context only).
 */
export type RoomMediaStatus = "idle" | "connecting" | "connected" | "error";

/** Future: chess, truth-or-dare — `active` null when not playing. */
export type RoomGamesState = {
  active: null | { kind: string };
};
