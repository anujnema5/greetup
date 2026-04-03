import type { Context } from "hono";
import { randomUUID } from "crypto";
import { ApiResponse, internalError } from "@/shared/responses";
import {
  findMatchService,
  getUserMatchStateService,
  cancelMatchService,
  leaveRoomService,
} from "../services/matchmaking.service";
import logger from "@/core/logging";

export const handleFindMatch = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    logger.info("[handleFindMatch] request received", { userId });

    const currentState = await getUserMatchStateService(userId);
    logger.info("[handleFindMatch] current engine state", { userId, state: currentState.status, requestId: currentState.requestId });

    if (currentState.status === "searching" && currentState.requestId) {
      logger.info("[handleFindMatch] idempotent — already searching", { userId, requestId: currentState.requestId });
      return c.json(
        ApiResponse.success(
          { requestId: currentState.requestId, status: "searching" },
          "Already searching",
          200
        ),
        200
      );
    }

    if (currentState.status === "matched" && currentState.roomId) {
      logger.warn("[handleFindMatch] user already in active session", { userId, roomId: currentState.roomId });
      return c.json(
        ApiResponse.error({
          message: "Already in an active session",
          statusCode: 409,
          code: "ALREADY_IN_SESSION",
        }),
        409
      );
    }

    const requestId = randomUUID();
    logger.info("[handleFindMatch] calling match engine", { userId, requestId });

    const engineResponse = await findMatchService(userId, requestId);
    logger.info("[handleFindMatch] engine response", { userId, requestId, engineData: engineResponse.data });

    return c.json(
      ApiResponse.success(
        { requestId, ...engineResponse.data },
        "Matchmaking started",
        200
      ),
      200
    );
  } catch (error) {
    logger.error("[handleFindMatch] failed", { error });
    return internalError(c, error, "MATCHMAKING_FAILED");
  }
};

export const handleCancelMatch = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    logger.info("[handleCancelMatch] request received", { userId });
    await cancelMatchService(userId);
    logger.info("[handleCancelMatch] cancelled successfully", { userId });
    return c.json(ApiResponse.success(null, "Match search cancelled", 200), 200);
  } catch (error) {
    logger.error("[handleCancelMatch] failed", { error });
    return internalError(c, error, "CANCEL_FAILED");
  }
};

/** Clears match-engine Redis state (`in_room`) so the user can search again. */
export const handleLeaveRoom = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    logger.info("[handleLeaveRoom] request received", { userId });
    await leaveRoomService(userId);
    return c.json(ApiResponse.success(null, "Left room", 200), 200);
  } catch (error) {
    logger.error("[handleLeaveRoom] failed", { error });
    return internalError(c, error, "LEAVE_ROOM_FAILED");
  }
};
