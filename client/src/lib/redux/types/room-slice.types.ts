/**
 * Global room / realtime session model (client-only).
 * Server truth stays in RTK Query; this slice holds UI + future WebRTC / games / chat.
 */

export type RoomSessionPhase = "idle" | "lobby" | "in_call";

/** Per-peer metadata — extend for streams, screenshare, connection quality, etc. */
export type RoomPeerEntry = {
  userId: string;
};

/** Placeholder for mediasoup / device pipeline — expand with transports, codecs. */
export type RoomMediaStatus = "idle" | "connecting" | "connected";

/** Future: chess, truth-or-dare — `active` null when not playing. */
export type RoomGamesState = {
  active: null | { kind: string };
};
