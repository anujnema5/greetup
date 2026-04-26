/**
 * In-room synchronized activities (chess today; more kinds later).
 * Lives in `roomActivity` Redux slice — separate from `room` session UI slice.
 */

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

/** Union with future activity kinds (watch party, quiz, …). */
export type RoomActiveActivity = RoomChessActivityState;

/** Snapshot when `room:chess_ended` fires — themed result UI + play again. */
export type RoomChessLastOutcome = {
  roomId: string;
  gameId: string;
  endedByUserId: string;
  endedAt: number;
  startedAt: number;
  winnerUserId: string | null;
  result: "checkmate" | "stalemate" | "draw" | "resign";
  whiteUserId: string;
  blackUserId: string;
};

export type RoomActivitySliceState = {
  /**
   * Last `/room/[roomId]` route id applied via `enterRoomPage`.
   * Used to clear activity only when the **route** room changes, not on remount with the same id.
   */
  routeRoomId: string | null;
  active: RoomActiveActivity | null;
  lastChessOutcome: RoomChessLastOutcome | null;
};
