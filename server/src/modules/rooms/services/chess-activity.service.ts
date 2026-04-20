import { randomUUID } from "crypto";

import { getRedis } from "@/core/redis";
import { roomsRepository } from "@/modules/rooms/repositories/rooms.repository";
import {
  emitChessDeclined,
  emitChessEnded,
  emitChessInvite,
  emitChessStarted,
} from "@/modules/rooms/socket/activity-socket.handler";
import {
  ensureDirectRoomActivityContext,
  RoomActivityError,
  type RoomActivityErrorCode,
} from "@/modules/rooms/services/room-activity.service";

const CHESS_INVITE_TTL_SEC = 90;
const CHESS_ACTIVE_TTL_SEC = 4 * 60 * 60;

const chessInviteKey = (requestId: string) => `room:chess:invite:${requestId}`;
const chessPendingByRoomKey = (roomId: string) => `room:chess:pending:${roomId}`;
const chessActiveByRoomKey = (roomId: string) => `room:chess:active:${roomId}`;

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

export type DirectRoomChessErrorCode =
  | RoomActivityErrorCode
  | "INVITE_PENDING"
  | "INVITE_NOT_FOUND"
  | "NOT_YOUR_INVITE"
  | "INVITE_NOT_PENDING"
  | "GAME_ALREADY_ACTIVE"
  | "GAME_NOT_ACTIVE"
  | "GAME_MISMATCH";

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

function toUnixMs(raw: string | undefined): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : Date.now();
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
      throw new DirectRoomChessError("A chess invite is already pending", "INVITE_PENDING", 409);
    }
    if (activeGame && activeGame.gameId) {
      throw new DirectRoomChessError("A chess game is already active", "GAME_ALREADY_ACTIVE", 409);
    }

    const requestId = randomUUID();
    const createdAt = Date.now();
    const inviteKey = chessInviteKey(requestId);

    const pendingClaimed = await redis.set(pendingKey, requestId, "EX", CHESS_INVITE_TTL_SEC, "NX");
    if (pendingClaimed !== "OK") {
      throw new DirectRoomChessError("A chess invite is already pending", "INVITE_PENDING", 409);
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
      throw new DirectRoomChessError("Invite not found", "INVITE_NOT_FOUND", 404);
    }
    if (invite.roomId !== roomId) {
      throw new DirectRoomChessError("Invite does not belong to this room", "INVITE_NOT_FOUND", 404);
    }
    if (invite.inviteeUserId !== inviteeUserId) {
      throw new DirectRoomChessError("This invite is not for you", "NOT_YOUR_INVITE", 403);
    }
    if (invite.status !== "pending") {
      throw new DirectRoomChessError("This invite is no longer pending", "INVITE_NOT_PENDING", 409);
    }

    const inviterUserId = invite.inviterUserId;
    if (!inviterUserId) {
      throw new DirectRoomChessError("Invite does not have a valid inviter", "INVITE_NOT_FOUND", 404);
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
      return { roomId, started: false, gameId: null };
    }

    const existingActive = await redis.hgetall(activeKey);
    if (existingActive && existingActive.gameId) {
      throw new DirectRoomChessError("A chess game is already active", "GAME_ALREADY_ACTIVE", 409);
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
      throw new DirectRoomChessError("No active chess game found", "GAME_NOT_ACTIVE", 404);
    }
    if (active.roomId !== roomId || active.gameId !== gameId) {
      throw new DirectRoomChessError("Game id does not match active chess game", "GAME_MISMATCH", 409);
    }

    const whiteUserId = active.whiteUserId;
    const blackUserId = active.blackUserId;
    if (!whiteUserId || !blackUserId || (endedByUserId !== whiteUserId && endedByUserId !== blackUserId)) {
      throw new DirectRoomChessError("You are not in this chess game", "NOT_PARTICIPANT", 403);
    }

    await redis.del(activeKey);

    const payload = {
      roomId,
      gameId,
      endedByUserId,
      endedAt: Date.now(),
      startedAt: toUnixMs(active.startedAt),
    };
    emitChessEnded(whiteUserId, blackUserId, payload);

    return { roomId, ended: true };
  } catch (error: unknown) {
    if (error instanceof RoomActivityError) {
      throw toChessError(error);
    }
    throw error;
  }
}
