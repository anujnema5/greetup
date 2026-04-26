/**
 * Global room / realtime session model (client-only).
 * Server truth stays in RTK Query; this slice holds UI + future WebRTC / activities / chat.
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

export type RoomChessActivityState = {
  kind: "chess";
  gameId: string;
  roomId: string;
  whiteUserId: string;
  blackUserId: string;
  startedByUserId: string;
  startedAt: number;
  fen: string;
  turn: "w" | "b";
  moveNumber: number;
  lastMoveSan: string | null;
  lastMoveAt: number | null;
};

export type RoomActiveActivity = RoomChessActivityState;

/** In-call activities that must stay synchronized between peers. */
export type RoomActivityState = {
  active: RoomActiveActivity | null;
};
