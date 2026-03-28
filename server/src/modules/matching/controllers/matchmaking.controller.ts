import type { Context } from "hono";
import { randomUUID } from "crypto";
import { ApiResponse } from "@/shared/responses";
import { findMatchService, getMatchResultService } from "../services/matchmaking.service";
import logger from "@/core/logging";

/**
 * POST /api/matchmaking/find
 * Initiates matchmaking for the authenticated user.
 * Generates a requestId, enqueues the user in the match engine, and returns immediately.
 * The client should poll GET /api/matchmaking/result/:requestId until a final status is reached.
 */
export const handleFindMatch = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const requestId = randomUUID();

    const engineResponse = await findMatchService(userId, requestId);

    return c.json(
      ApiResponse.success(
        { requestId, ...engineResponse.data },
        "Matchmaking started",
        200
      ),
      200
    );
  } catch (error) {
    logger.error("Failed to start matchmaking", { error });
    return c.json(
      ApiResponse.error({
        message: "Failed to start matchmaking",
        statusCode: 500,
        code: "MATCHMAKING_FAILED",
      }),
      500
    );
  }
};

/**
 * GET /api/matchmaking/result/:requestId
 * Polls the match engine for the result of an ongoing match attempt.
 * Possible statuses: "searching" | "matched" | "no_match"
 */
export const handleGetMatchResult = async (c: Context) => {
  try {
    const requestId = c.req.param("requestId");

    if (!requestId?.trim()) {
      return c.json(
        ApiResponse.error({ message: "requestId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
        400
      );
    }

    const engineResponse = await getMatchResultService(requestId);

    return c.json(
      ApiResponse.success(engineResponse.data, "Match result retrieved", 200),
      200
    );
  } catch (error) {
    logger.error("Failed to get match result", { error });
    return c.json(
      ApiResponse.error({
        message: "Failed to get match result",
        statusCode: 500,
        code: "MATCH_RESULT_FAILED",
      }),
      500
    );
  }
};
