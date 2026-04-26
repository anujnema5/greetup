import { emitToUser } from "@/core/socket/socket";
import { CHESS_SOCKET_EVENTS } from "@/modules/rooms/constants/chess-socket.events";

type ChessInvitePayload = {
  requestId: string;
  roomId: string;
  inviterUserId: string;
  inviterDisplayName: string;
  createdAt: number;
};

type ChessDeclinedPayload = {
  requestId: string;
  roomId: string;
  inviteeUserId: string;
};

type ChessStartedPayload = {
  gameId: string;
  roomId: string;
  whiteUserId: string;
  blackUserId: string;
  startedByUserId: string;
  startedAt: number;
  fen: string;
  turn: "w" | "b";
};

type ChessMovedPayload = {
  roomId: string;
  gameId: string;
  movedByUserId: string;
  from: string;
  to: string;
  san: string;
  fen: string;
  turn: "w" | "b";
  moveNumber: number;
  movedAt: number;
};

type ChessEndedPayload = {
  roomId: string;
  gameId: string;
  endedByUserId: string;
  endedAt: number;
  startedAt: number;
  winnerUserId: string | null;
  result: "checkmate" | "stalemate" | "draw" | "resign";
};

type ChessDrawOfferedPayload = {
  roomId: string;
  gameId: string;
  offeredByUserId: string;
};

type ChessDrawRejectedPayload = {
  roomId: string;
  gameId: string;
  rejectedByUserId: string;
};

export function emitChessInvite(inviteeUserId: string, payload: ChessInvitePayload): void {
  emitToUser(inviteeUserId, CHESS_SOCKET_EVENTS.invite, payload);
}

export function emitChessDeclined(inviterUserId: string, payload: ChessDeclinedPayload): void {
  emitToUser(inviterUserId, CHESS_SOCKET_EVENTS.declined, payload);
}

export function emitChessStarted(
  inviterUserId: string,
  inviteeUserId: string,
  payload: ChessStartedPayload,
): void {
  emitToUser(inviterUserId, CHESS_SOCKET_EVENTS.started, payload);
  emitToUser(inviteeUserId, CHESS_SOCKET_EVENTS.started, payload);
}

export function emitChessMoved(
  whiteUserId: string,
  blackUserId: string,
  payload: ChessMovedPayload,
): void {
  emitToUser(whiteUserId, CHESS_SOCKET_EVENTS.moved, payload);
  emitToUser(blackUserId, CHESS_SOCKET_EVENTS.moved, payload);
}

export function emitChessEnded(
  whiteUserId: string,
  blackUserId: string,
  payload: ChessEndedPayload,
): void {
  emitToUser(whiteUserId, CHESS_SOCKET_EVENTS.ended, payload);
  emitToUser(blackUserId, CHESS_SOCKET_EVENTS.ended, payload);
}

export function emitChessDrawOffered(targetUserId: string, payload: ChessDrawOfferedPayload): void {
  emitToUser(targetUserId, CHESS_SOCKET_EVENTS.drawOffered, payload);
}

export function emitChessDrawRejected(targetUserId: string, payload: ChessDrawRejectedPayload): void {
  emitToUser(targetUserId, CHESS_SOCKET_EVENTS.drawRejected, payload);
}
