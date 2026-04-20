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
};

type ChessEndedPayload = {
  roomId: string;
  gameId: string;
  endedByUserId: string;
  endedAt: number;
  startedAt: number;
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

export function emitChessEnded(
  whiteUserId: string,
  blackUserId: string,
  payload: ChessEndedPayload,
): void {
  emitToUser(whiteUserId, CHESS_SOCKET_EVENTS.ended, payload);
  emitToUser(blackUserId, CHESS_SOCKET_EVENTS.ended, payload);
}
