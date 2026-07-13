import { randomUUID } from "crypto";

import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import {
  emitChessDeclined,
  emitChessDrawOffered,
  emitChessDrawRejected,
  emitChessEnded,
  emitChessInvite,
  emitChessMoved,
  emitChessStarted,
} from "@/modules/rooms/socket/activity-socket.handler";
import {
  ensureDirectRoomActivityContext,
  RoomActivityError,
  type RoomActivityErrorCode,
} from "@/modules/rooms/services/activity/room-activity.service";

const CHESS_INVITE_TTL_SEC = 90;
const CHESS_ACTIVE_TTL_SEC = 4 * 60 * 60;
const CHESS_INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const chessInviteKey = (requestId: string) => `room:chess:invite:${requestId}`;
const chessPendingByRoomKey = (roomId: string) => `room:chess:pending:${roomId}`;
const chessActiveByRoomKey = (roomId: string) => `room:chess:active:${roomId}`;
const chessDrawOfferKey = (roomId: string, gameId: string) => `room:chess:draw:${roomId}:${gameId}`;

export type ChessInviteResult = {
  requestId: string;
  inviteeUserId: string;
};

export type ChessRespondResult = {
  roomId: string;
  started: boolean;
  gameId: string | null;
};

export type ChessEndResult = {
  roomId: string;
  ended: boolean;
};

export type ChessMoveResult = {
  roomId: string;
  gameId: string;
  moved: boolean;
  moveNumber: number;
  fen: string;
  turn: "w" | "b";
  isGameOver: boolean;
};

export type ChessDrawOfferResult = {
  roomId: string;
  gameId: string;
  offered: boolean;
};

export type ChessDrawRespondResult = {
  roomId: string;
  gameId: string;
  accepted: boolean;
};

export type DirectRoomChessErrorCode =
  | RoomActivityErrorCode
  | "INVITE_PENDING"
  | "INVITE_NOT_FOUND"
  | "NOT_YOUR_INVITE"
  | "INVITE_NOT_PENDING"
  | "GAME_ALREADY_ACTIVE"
  | "GAME_NOT_ACTIVE"
  | "GAME_MISMATCH"
  | "NOT_YOUR_TURN"
  | "DRAW_ALREADY_PENDING"
  | "DRAW_NOT_PENDING"
  | "DRAW_NOT_FOR_YOU";

export class DirectRoomChessError extends Error {
  constructor(
    message: string,
    public readonly code: DirectRoomChessErrorCode,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "DirectRoomChessError";
  }
}

function toChessError(error: RoomActivityError): DirectRoomChessError {
  let message = error.message;
  if (error.code === "NOT_DIRECT") {
    message = "Chess is available only in direct calls";
  }
  return new DirectRoomChessError(message, error.code, error.statusCode);
}

function rejectDirectRoomChess(
  roomId: string,
  userId: string,
  message: string,
  code: DirectRoomChessErrorCode,
  statusCode: number,
): never {
  logger.warn("chess_activity_rejected", { roomId, userId, code, message });
  throw new DirectRoomChessError(message, code, statusCode);
}

function toUnixMs(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function toTurn(raw: string | undefined): "w" | "b" {
  return raw === "b" ? "b" : "w";
}

function toMoveNumber(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export async function createDirectRoomChessInvite(
  roomId: string,
  inviterUserId: string,
): Promise<ChessInviteResult> {
  try {
    const { peerUserId: inviteeUserId } = await ensureDirectRoomActivityContext(roomId, inviterUserId);

    const redis = getRedis();
    const pendingKey = chessPendingByRoomKey(roomId);
    const activeKey = chessActiveByRoomKey(roomId);
    const [pendingRequestId, activeGame] = await Promise.all([
      redis.get(pendingKey),
      redis.hgetall(activeKey),
    ]);

    if (pendingRequestId) {
      rejectDirectRoomChess(roomId, inviterUserId, "A chess invite is already pending", "INVITE_PENDING", 409);
    }
    if (activeGame && activeGame.gameId) {
      rejectDirectRoomChess(roomId, inviterUserId, "A chess game is already active", "GAME_ALREADY_ACTIVE", 409);
    }

    const requestId = randomUUID();
    const createdAt = Date.now();
    const inviteKey = chessInviteKey(requestId);

    const pendingClaimed = await redis.set(pendingKey, requestId, "EX", CHESS_INVITE_TTL_SEC, "NX");
    if (pendingClaimed !== "OK") {
      rejectDirectRoomChess(roomId, inviterUserId, "A chess invite is already pending", "INVITE_PENDING", 409);
    }

    await redis.hset(inviteKey, {
      requestId,
      roomId,
      inviterUserId,
      inviteeUserId,
      status: "pending",
      createdAt,
    });
    await redis.expire(inviteKey, CHESS_INVITE_TTL_SEC);

    const inviterDisplayName = await roomsRepository.findUserDisplayLabel(inviterUserId);
    emitChessInvite(inviteeUserId, {
      requestId,
      roomId,
      inviterUserId,
      inviterDisplayName,
      createdAt,
    });

    logger.info("chess_invite_created", { roomId, inviterUserId, inviteeUserId, requestId });
    return { requestId, inviteeUserId };
  } catch (error: unknown) {
    if (error instanceof RoomActivityError) {
      throw toChessError(error);
    }
    throw error;
  }
}

export async function respondDirectRoomChessInvite(
  roomId: string,
  requestId: string,
  inviteeUserId: string,
  accept: boolean,
): Promise<ChessRespondResult> {
  try {
    await ensureDirectRoomActivityContext(roomId, inviteeUserId);

    const redis = getRedis();
    const inviteKey = chessInviteKey(requestId);
    const pendingKey = chessPendingByRoomKey(roomId);
    const activeKey = chessActiveByRoomKey(roomId);

    const invite = await redis.hgetall(inviteKey);
    if (!invite || !invite.requestId) {
      rejectDirectRoomChess(roomId, inviteeUserId, "Invite not found", "INVITE_NOT_FOUND", 404);
    }
    if (invite.roomId !== roomId) {
      rejectDirectRoomChess(roomId, inviteeUserId, "Invite does not belong to this room", "INVITE_NOT_FOUND", 404);
    }
    if (invite.inviteeUserId !== inviteeUserId) {
      rejectDirectRoomChess(roomId, inviteeUserId, "This invite is not for you", "NOT_YOUR_INVITE", 403);
    }
    if (invite.status !== "pending") {
      rejectDirectRoomChess(roomId, inviteeUserId, "This invite is no longer pending", "INVITE_NOT_PENDING", 409);
    }

    const inviterUserId = invite.inviterUserId;
    if (!inviterUserId) {
      rejectDirectRoomChess(roomId, inviteeUserId, "Invite does not have a valid inviter", "INVITE_NOT_FOUND", 404);
    }

    if (!accept) {
      await redis.hset(inviteKey, {
        status: "declined",
        respondedAt: Date.now(),
      });
      await Promise.all([redis.del(pendingKey), redis.expire(inviteKey, 30)]);
      emitChessDeclined(inviterUserId, {
        requestId,
        roomId,
        inviteeUserId,
      });
      logger.info("chess_invite_responded", { roomId, inviteeUserId, requestId, accept: false });
      return { roomId, started: false, gameId: null };
    }

    const existingActive = await redis.hgetall(activeKey);
    if (existingActive && existingActive.gameId) {
      rejectDirectRoomChess(roomId, inviteeUserId, "A chess game is already active", "GAME_ALREADY_ACTIVE", 409);
    }

    const gameId = randomUUID();
    const startedAt = Date.now();
    const gamePayload = {
      gameId,
      roomId,
      whiteUserId: inviterUserId,
      blackUserId: inviteeUserId,
      startedByUserId: inviteeUserId,
      startedAt,
      fen: CHESS_INITIAL_FEN,
      turn: "w" as const,
      turnUserId: inviterUserId,
      moveNumber: 0,
    };

    await redis.hset(activeKey, gamePayload);
    await redis.expire(activeKey, CHESS_ACTIVE_TTL_SEC);
    await redis.hset(inviteKey, {
      status: "accepted",
      gameId,
      respondedAt: startedAt,
    });
    await Promise.all([redis.del(pendingKey), redis.expire(inviteKey, 30)]);

    emitChessStarted(inviterUserId, inviteeUserId, gamePayload);

    logger.info("chess_invite_responded", { roomId, inviteeUserId, requestId, accept: true, gameId });
    return { roomId, started: true, gameId };
  } catch (error: unknown) {
    if (error instanceof RoomActivityError) {
      throw toChessError(error);
    }
    throw error;
  }
}

export async function endDirectRoomChessGame(
  roomId: string,
  gameId: string,
  endedByUserId: string,
): Promise<ChessEndResult> {
  try {
    await ensureDirectRoomActivityContext(roomId, endedByUserId);

    const redis = getRedis();
    const activeKey = chessActiveByRoomKey(roomId);
    const active = await redis.hgetall(activeKey);

    if (!active || !active.gameId) {
      rejectDirectRoomChess(roomId, endedByUserId, "No active chess game found", "GAME_NOT_ACTIVE", 404);
    }
    if (active.roomId !== roomId || active.gameId !== gameId) {
      rejectDirectRoomChess(roomId, endedByUserId, "Game id does not match active chess game", "GAME_MISMATCH", 409);
    }

    const whiteUserId = active.whiteUserId;
    const blackUserId = active.blackUserId;
    if (!whiteUserId || !blackUserId || (endedByUserId !== whiteUserId && endedByUserId !== blackUserId)) {
      rejectDirectRoomChess(roomId, endedByUserId, "You are not in this chess game", "NOT_PARTICIPANT", 403);
    }

    await redis.del(activeKey);

    const payload = {
      roomId,
      gameId,
      endedByUserId,
      endedAt: Date.now(),
      startedAt: toUnixMs(active.startedAt),
      winnerUserId: endedByUserId === whiteUserId ? blackUserId : whiteUserId,
      result: "resign" as const,
    };
    emitChessEnded(whiteUserId, blackUserId, payload);

    logger.info("chess_game_ended", { roomId, gameId, endedByUserId, result: "resign" });
    return { roomId, ended: true };
  } catch (error: unknown) {
    if (error instanceof RoomActivityError) {
      throw toChessError(error);
    }
    throw error;
  }
}

export async function moveDirectRoomChessGame(
  roomId: string,
  gameId: string,
  movedByUserId: string,
  move: {
    from: string;
    to: string;
    san: string;
    fen: string;
    turn: "w" | "b";
    isGameOver: boolean;
    winnerUserId: string | null;
    result: "checkmate" | "stalemate" | "draw";
  },
): Promise<ChessMoveResult> {
  try {
    await ensureDirectRoomActivityContext(roomId, movedByUserId);

    const redis = getRedis();
    const activeKey = chessActiveByRoomKey(roomId);
    const active = await redis.hgetall(activeKey);

    if (!active || !active.gameId) {
      rejectDirectRoomChess(roomId, movedByUserId, "No active chess game found", "GAME_NOT_ACTIVE", 404);
    }
    if (active.roomId !== roomId || active.gameId !== gameId) {
      rejectDirectRoomChess(roomId, movedByUserId, "Game id does not match active chess game", "GAME_MISMATCH", 409);
    }

    const whiteUserId = active.whiteUserId;
    const blackUserId = active.blackUserId;
    if (!whiteUserId || !blackUserId || (movedByUserId !== whiteUserId && movedByUserId !== blackUserId)) {
      rejectDirectRoomChess(roomId, movedByUserId, "You are not in this chess game", "NOT_PARTICIPANT", 403);
    }

    const turnUserId = active.turnUserId;
    if (turnUserId && turnUserId !== movedByUserId) {
      rejectDirectRoomChess(roomId, movedByUserId, "Not your turn", "NOT_YOUR_TURN", 409);
    }

    const nextTurnUserId = move.turn === "w" ? whiteUserId : blackUserId;
    const moveNumber = toMoveNumber(active.moveNumber) + 1;
    const movedAt = Date.now();

    if (move.isGameOver) {
      await redis.del(activeKey);
      emitChessEnded(whiteUserId, blackUserId, {
        roomId,
        gameId,
        endedByUserId: movedByUserId,
        endedAt: movedAt,
        startedAt: toUnixMs(active.startedAt),
        winnerUserId: move.winnerUserId,
        result: move.result,
      });
      logger.info("chess_move_applied", {
        roomId,
        gameId,
        movedByUserId,
        moveNumber,
        isGameOver: true,
        result: move.result,
      });
      return {
        roomId,
        gameId,
        moved: true,
        moveNumber,
        fen: move.fen,
        turn: toTurn(move.turn),
        isGameOver: true,
      };
    }

    await redis.hset(activeKey, {
      fen: move.fen,
      turn: move.turn,
      turnUserId: nextTurnUserId,
      moveNumber,
      lastMoveSan: move.san,
      lastMoveAt: movedAt,
    });
    await redis.expire(activeKey, CHESS_ACTIVE_TTL_SEC);

    emitChessMoved(whiteUserId, blackUserId, {
      roomId,
      gameId,
      movedByUserId,
      from: move.from,
      to: move.to,
      san: move.san,
      fen: move.fen,
      turn: toTurn(move.turn),
      moveNumber,
      movedAt,
    });

    logger.info("chess_move_applied", {
      roomId,
      gameId,
      movedByUserId,
      moveNumber,
      isGameOver: false,
    });
    return {
      roomId,
      gameId,
      moved: true,
      moveNumber,
      fen: move.fen,
      turn: toTurn(move.turn),
      isGameOver: false,
    };
  } catch (error: unknown) {
    if (error instanceof RoomActivityError) {
      throw toChessError(error);
    }
    throw error;
  }
}

export async function offerDirectRoomChessDraw(
  roomId: string,
  gameId: string,
  offeredByUserId: string,
): Promise<ChessDrawOfferResult> {
  try {
    await ensureDirectRoomActivityContext(roomId, offeredByUserId);
    const redis = getRedis();
    const activeKey = chessActiveByRoomKey(roomId);
    const active = await redis.hgetall(activeKey);
    if (!active || !active.gameId) {
      throw new DirectRoomChessError("No active chess game found", "GAME_NOT_ACTIVE", 404);
    }
    if (active.roomId !== roomId || active.gameId !== gameId) {
      throw new DirectRoomChessError("Game id does not match active chess game", "GAME_MISMATCH", 409);
    }

    const whiteUserId = active.whiteUserId;
    const blackUserId = active.blackUserId;
    if (!whiteUserId || !blackUserId || (offeredByUserId !== whiteUserId && offeredByUserId !== blackUserId)) {
      throw new DirectRoomChessError("You are not in this chess game", "NOT_PARTICIPANT", 403);
    }

    const drawKey = chessDrawOfferKey(roomId, gameId);
    const pending = await redis.hgetall(drawKey);
    if (pending?.offeredByUserId) {
      throw new DirectRoomChessError("Draw offer already pending", "DRAW_ALREADY_PENDING", 409);
    }

    const targetUserId = offeredByUserId === whiteUserId ? blackUserId : whiteUserId;
    await redis.hset(drawKey, { roomId, gameId, offeredByUserId, targetUserId, createdAt: Date.now() });
    await redis.expire(drawKey, 120);
    emitChessDrawOffered(targetUserId, { roomId, gameId, offeredByUserId });

    return { roomId, gameId, offered: true };
  } catch (error: unknown) {
    if (error instanceof RoomActivityError) throw toChessError(error);
    throw error;
  }
}

export async function respondDirectRoomChessDraw(
  roomId: string,
  gameId: string,
  responderUserId: string,
  accept: boolean,
): Promise<ChessDrawRespondResult> {
  try {
    await ensureDirectRoomActivityContext(roomId, responderUserId);
    const redis = getRedis();
    const drawKey = chessDrawOfferKey(roomId, gameId);
    const offer = await redis.hgetall(drawKey);
    if (!offer || !offer.offeredByUserId) {
      throw new DirectRoomChessError("No pending draw offer", "DRAW_NOT_PENDING", 404);
    }
    if (offer.targetUserId !== responderUserId) {
      throw new DirectRoomChessError("Draw offer is not for you", "DRAW_NOT_FOR_YOU", 403);
    }

    const offeredByUserId = offer.offeredByUserId;
    await redis.del(drawKey);

    if (!accept) {
      emitChessDrawRejected(offeredByUserId, {
        roomId,
        gameId,
        rejectedByUserId: responderUserId,
      });
      return { roomId, gameId, accepted: false };
    }

    const activeKey = chessActiveByRoomKey(roomId);
    const active = await redis.hgetall(activeKey);
    if (active?.gameId === gameId && active.whiteUserId && active.blackUserId) {
      await redis.del(activeKey);
      emitChessEnded(active.whiteUserId, active.blackUserId, {
        roomId,
        gameId,
        endedByUserId: responderUserId,
        endedAt: Date.now(),
        startedAt: toUnixMs(active.startedAt),
        winnerUserId: null,
        result: "draw",
      });
    }

    return { roomId, gameId, accepted: true };
  } catch (error: unknown) {
    if (error instanceof RoomActivityError) throw toChessError(error);
    throw error;
  }
}
