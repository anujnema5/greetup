export const CHESS_SOCKET_EVENTS = {
  invite: "room:chess_invite",
  declined: "room:chess_declined",
  started: "room:chess_started",
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
};

export type ChessEndedPayload = {
  roomId: string;
  gameId: string;
  endedByUserId: string;
  endedAt: number;
  startedAt: number;
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
    typeof raw.startedAt !== "number"
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
  };
}

export function parseChessEndedPayload(raw: unknown): ChessEndedPayload | null {
  if (!isObject(raw)) return null;
  if (
    typeof raw.roomId !== "string" ||
    typeof raw.gameId !== "string" ||
    typeof raw.endedByUserId !== "string" ||
    typeof raw.endedAt !== "number" ||
    typeof raw.startedAt !== "number"
  ) {
    return null;
  }
  return {
    roomId: raw.roomId,
    gameId: raw.gameId,
    endedByUserId: raw.endedByUserId,
    endedAt: raw.endedAt,
    startedAt: raw.startedAt,
  };
}
