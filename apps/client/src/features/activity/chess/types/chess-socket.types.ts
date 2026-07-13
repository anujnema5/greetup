export const CHESS_SOCKET_EVENTS = {
  invite: "room:chess_invite",
  declined: "room:chess_declined",
  started: "room:chess_started",
  moved: "room:chess_moved",
  drawOffered: "room:chess_draw_offered",
  drawRejected: "room:chess_draw_rejected",
  ended: "room:chess_ended",
} as const;

export type ChessInvitePayload = {
  requestId: string;
  roomId: string;
  inviterUserId: string;
  inviterDisplayName: string;
  createdAt: number;
};

export type ChessDeclinedPayload = {
  requestId: string;
  roomId: string;
  inviteeUserId: string;
};

export type ChessStartedPayload = {
  gameId: string;
  roomId: string;
  whiteUserId: string;
  blackUserId: string;
  startedByUserId: string;
  startedAt: number;
  fen: string;
  turn: "w" | "b";
};

export type ChessMovedPayload = {
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

export type ChessDrawOfferedPayload = {
  roomId: string;
  gameId: string;
  offeredByUserId: string;
};

export type ChessDrawRejectedPayload = {
  roomId: string;
  gameId: string;
  rejectedByUserId: string;
};

export type ChessEndedPayload = {
  roomId: string;
  gameId: string;
  endedByUserId: string;
  endedAt: number;
  startedAt: number;
  winnerUserId: string | null;
  result: "checkmate" | "stalemate" | "draw" | "resign";
};

function isObject(raw: unknown): raw is Record<string, unknown> {
  return !!raw && typeof raw === "object";
}

export function parseChessInvitePayload(raw: unknown): ChessInvitePayload | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.requestId !== "string" ||
    typeof raw.roomId !== "string" ||
    typeof raw.inviterUserId !== "string" ||
    typeof raw.inviterDisplayName !== "string" ||
    typeof raw.createdAt !== "number"
  ) {
    return null;
  }
  return {
    requestId: raw.requestId,
    roomId: raw.roomId,
    inviterUserId: raw.inviterUserId,
    inviterDisplayName: raw.inviterDisplayName,
    createdAt: raw.createdAt,
  };
}

export function parseChessDeclinedPayload(raw: unknown): ChessDeclinedPayload | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.requestId !== "string" ||
    typeof raw.roomId !== "string" ||
    typeof raw.inviteeUserId !== "string"
  ) {
    return null;
  }
  return {
    requestId: raw.requestId,
    roomId: raw.roomId,
    inviteeUserId: raw.inviteeUserId,
  };
}

export function parseChessStartedPayload(raw: unknown): ChessStartedPayload | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.gameId !== "string" ||
    typeof raw.roomId !== "string" ||
    typeof raw.whiteUserId !== "string" ||
    typeof raw.blackUserId !== "string" ||
    typeof raw.startedByUserId !== "string" ||
    typeof raw.startedAt !== "number" ||
    typeof raw.fen !== "string" ||
    (raw.turn !== "w" && raw.turn !== "b")
  ) {
    return null;
  }
  return {
    gameId: raw.gameId,
    roomId: raw.roomId,
    whiteUserId: raw.whiteUserId,
    blackUserId: raw.blackUserId,
    startedByUserId: raw.startedByUserId,
    startedAt: raw.startedAt,
    fen: raw.fen,
    turn: raw.turn,
  };
}

export function parseChessMovedPayload(raw: unknown): ChessMovedPayload | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.roomId !== "string" ||
    typeof raw.gameId !== "string" ||
    typeof raw.movedByUserId !== "string" ||
    typeof raw.from !== "string" ||
    typeof raw.to !== "string" ||
    typeof raw.san !== "string" ||
    typeof raw.fen !== "string" ||
    (raw.turn !== "w" && raw.turn !== "b") ||
    typeof raw.moveNumber !== "number" ||
    typeof raw.movedAt !== "number"
  ) {
    return null;
  }
  return {
    roomId: raw.roomId,
    gameId: raw.gameId,
    movedByUserId: raw.movedByUserId,
    from: raw.from,
    to: raw.to,
    san: raw.san,
    fen: raw.fen,
    turn: raw.turn,
    moveNumber: raw.moveNumber,
    movedAt: raw.movedAt,
  };
}

export function parseChessDrawOfferedPayload(raw: unknown): ChessDrawOfferedPayload | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.roomId !== "string" ||
    typeof raw.gameId !== "string" ||
    typeof raw.offeredByUserId !== "string"
  ) {
    return null;
  }
  return {
    roomId: raw.roomId,
    gameId: raw.gameId,
    offeredByUserId: raw.offeredByUserId,
  };
}

export function parseChessDrawRejectedPayload(raw: unknown): ChessDrawRejectedPayload | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.roomId !== "string" ||
    typeof raw.gameId !== "string" ||
    typeof raw.rejectedByUserId !== "string"
  ) {
    return null;
  }
  return {
    roomId: raw.roomId,
    gameId: raw.gameId,
    rejectedByUserId: raw.rejectedByUserId,
  };
}

export function parseChessEndedPayload(raw: unknown): ChessEndedPayload | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.roomId !== "string" ||
    typeof raw.gameId !== "string" ||
    typeof raw.endedByUserId !== "string" ||
    typeof raw.endedAt !== "number" ||
    typeof raw.startedAt !== "number" ||
    (raw.winnerUserId !== null && typeof raw.winnerUserId !== "string") ||
    (raw.result !== "checkmate" &&
      raw.result !== "stalemate" &&
      raw.result !== "draw" &&
      raw.result !== "resign")
  ) {
    return null;
  }
  return {
    roomId: raw.roomId,
    gameId: raw.gameId,
    endedByUserId: raw.endedByUserId,
    endedAt: raw.endedAt,
    startedAt: raw.startedAt,
    winnerUserId: raw.winnerUserId,
    result: raw.result,
  };
}
