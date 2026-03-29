import type { Context } from "hono";
import { randomUUID } from "crypto";
import { ApiResponse } from "@/shared/responses";
import { emitToUser } from "@/core/socket/socket";
import logger from "@/core/logging";
import { createRoomBodySchema, matchCompletedBodySchema } from "../schemas/room.schema";

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
      return c.json(
        ApiResponse.error({ message: "Invalid request body", statusCode: 400, code: "VALIDATION_ERROR" }),
        400
      );
    }

    const { attemptId, pairId, users } = parsed.data;

    const roomId = randomUUID();
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
 * POST /internal/webhook/match-completed
 * Called by the match engine after a match is finalised.
 * Emits a socket event to both matched users so their clients can react.
 */
export const handleMatchCompleted = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = matchCompletedBodySchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        ApiResponse.error({ message: "Invalid request body", statusCode: 400, code: "VALIDATION_ERROR" }),
        400
      );
    }

    const { attemptId, userA, userB, roomId, matchScore, isFallbackMatch } = parsed.data;

    const payload = { attemptId, roomId, matchScore, isFallbackMatch };

    emitToUser(userA, "match:completed", { ...payload, peerId: userB });
    emitToUser(userB, "match:completed", { ...payload, peerId: userA });

    logger.info("Match completed webhook received", { attemptId, userA, userB, roomId });

    return c.json(ApiResponse.success(null, "Notified"), 200);
  } catch (error) {
    logger.error("Failed to handle match completed webhook", { error });
    return c.json(
      ApiResponse.error({ message: "Internal error", statusCode: 500, code: "INTERNAL_ERROR" }),
      500
    );
  }
};
