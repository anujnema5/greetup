import type { Context } from "hono";
import { randomUUID } from "crypto";
import { ApiResponse } from "@/shared/responses";
import { emitToUser } from "@/core/socket/socket";
import logger from "@/core/logging";
import { getRedis } from "@/core/redis";
import { ROOM_KEYS, ROOM_TTL } from "@/core/redis/keys";
import {
  createRoomBodySchema,
  ensureProfileSnapshotBodySchema,
  matchCompletedBodySchema,
  matchFailedBodySchema,
} from "../schemas/room.schema";
import { ensureProfileSnapshotCached } from "@/modules/user/services/profile-snapshot-cache.service";
import { internalError, invalidRequestBody } from "../lib/http-responses";

/**
 * POST /internal/rooms/match
 * Called by the match engine to provision a room for a matched pair.
 * Returns a roomId the match engine stores and passes back to clients.
 */
export const handleCreateRoom = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = createRoomBodySchema.safeParse(body);

    if (!parsed.success) {
      return invalidRequestBody(c);
    }

    const { attemptId, pairId, users } = parsed.data;

    const roomId = randomUUID();
    const redis = getRedis();
    const key = `${ROOM_KEYS.ROOM}${roomId}`;
    await redis.hset(key, {
      roomId,
      attemptId,
      pairId,
      userA: users[0],
      userB: users[1],
      createdAt: Date.now(),
    });
    await redis.expire(key, ROOM_TTL);

    logger.info("Room created", { roomId, attemptId, pairId, users });

    return c.json(ApiResponse.success({ roomId }, "Room created", 201), 201);
  } catch (error) {
    logger.error("Failed to create room", { error });
    return c.json(
      ApiResponse.error({ message: "Failed to create room", statusCode: 500, code: "INTERNAL_ERROR" }),
      500
    );
  }
};

/**
 * GET /api/room/:roomId
 * Returns room participants for a given roomId.
 */
export const handleGetRoom = async (c: Context) => {
  const roomId = c.req.param("roomId");
  if (!roomId) {
    return c.json(
      ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
      400
    );
  }

  try {
    const redis = getRedis();
    const room = await redis.hgetall(`${ROOM_KEYS.ROOM}${roomId}`);
    if (!room || !room.roomId) {
      return c.json(
        ApiResponse.error({ message: "Room not found", statusCode: 404, code: "NOT_FOUND" }),
        404
      );
    }

    return c.json(
      ApiResponse.success(
        { roomId: room.roomId, userA: room.userA, userB: room.userB, matchScore: room.matchScore ?? null },
        "Room found"
      )
    );
  } catch (error) {
    logger.error("Failed to get room", { error });
    return internalError(c);
  }
};

/**
 * POST /internal/webhook/ensure-profile-snapshot
 * Called by the matching service when Redis has no `user:profile:snapshot:{userId}`.
 * Loads the profile from the database and writes the snapshot key (NX).
 */
export const handleEnsureProfileSnapshot = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = ensureProfileSnapshotBodySchema.safeParse(body);

    if (!parsed.success) {
      return invalidRequestBody(c);
    }

    const cached = await ensureProfileSnapshotCached(parsed.data.userId);
    if (!cached) {
      return c.json(
        ApiResponse.error({ message: "Profile not found", statusCode: 404, code: "PROFILE_NOT_FOUND" }),
        404
      );
    }

    return c.json(ApiResponse.success({ cached: true }, "Profile snapshot cached"), 200);
  } catch (error) {
    logger.error("Failed to ensure profile snapshot", { error });
    return internalError(c);
  }
};

/**
 * POST /internal/webhook/match-failed
 * Called by the match engine when no compatible candidate is found.
 * Emits a socket event to the user so their client can react.
 */
export const handleMatchFailed = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = matchFailedBodySchema.safeParse(body);

    if (!parsed.success) {
      return invalidRequestBody(c);
    }

    const { attemptId, userId, reason } = parsed.data;

    logger.info("[handleMatchFailed] webhook received — emitting match:no_match to user", { attemptId, userId, reason });

    emitToUser(userId, "match:no_match", { attemptId, reason });

    return c.json(ApiResponse.success(null, "Notified"), 200);
  } catch (error) {
    logger.error("Failed to handle match failed webhook", { error });
    return internalError(c);
  }
};

/**
 * POST /internal/webhook/match-completed
 * Called by the match engine after a match is finalised.
 * Emits a socket event to both matched users so their clients can react.
 */
export const handleMatchCompleted = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = matchCompletedBodySchema.safeParse(body);

    if (!parsed.success) {
      return invalidRequestBody(c);
    }

    const { attemptId, userA, userB, roomId, matchScore, isFallbackMatch } = parsed.data;

    logger.info("[handleMatchCompleted] webhook received — emitting match:completed to both users", { attemptId, userA, userB, roomId, matchScore, isFallbackMatch });

    const payload = { attemptId, roomId, matchScore, isFallbackMatch };

    emitToUser(userA, "match:completed", { ...payload, peerId: userB });
    logger.info("[handleMatchCompleted] emitted match:completed to userA", { userA, roomId });

    emitToUser(userB, "match:completed", { ...payload, peerId: userA });
    logger.info("[handleMatchCompleted] emitted match:completed to userB", { userB, roomId });

    return c.json(ApiResponse.success(null, "Notified"), 200);
  } catch (error) {
    logger.error("Failed to handle match completed webhook", { error });
    return internalError(c);
  }
};
