/**
 * Activity API — argument/result types for in-room activities.
 */

/** Common JSON envelope for activity POST responses. */
export type ActivityApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type RoomChessInviteMutationArg = { roomId: string };
export type RoomChessInviteMutationResult = { requestId: string; inviteeUserId: string };

export type RoomChessRespondMutationArg = {
  roomId: string;
  requestId: string;
  accept: boolean;
};
export type RoomChessRespondMutationResult = { roomId: string; started: boolean; gameId: string | null };

export type RoomChessEndMutationArg = {
  roomId: string;
  gameId: string;
};
export type RoomChessEndMutationResult = { roomId: string; ended: boolean };

export type RoomChessMoveMutationArg = {
  roomId: string;
  gameId: string;
  from: string;
  to: string;
  san: string;
  fen: string;
  turn: "w" | "b";
  isGameOver: boolean;
  winnerUserId: string | null;
  result: "checkmate" | "stalemate" | "draw";
};

export type RoomChessMoveMutationResult = {
  roomId: string;
  gameId: string;
  moved: boolean;
  moveNumber: number;
  fen: string;
  turn: "w" | "b";
  isGameOver: boolean;
};

export type RoomChessDrawOfferMutationArg = {
  roomId: string;
  gameId: string;
};
export type RoomChessDrawOfferMutationResult = {
  roomId: string;
  gameId: string;
  offered: boolean;
};

export type RoomChessDrawRespondMutationArg = {
  roomId: string;
  gameId: string;
  accept: boolean;
};
export type RoomChessDrawRespondMutationResult = {
  roomId: string;
  gameId: string;
  accepted: boolean;
};
