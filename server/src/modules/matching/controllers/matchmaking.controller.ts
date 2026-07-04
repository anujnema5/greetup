import type { Context } from "hono";
import { randomUUID } from "crypto";
import { ApiResponse, internalError } from "@/shared/responses";
import {
  findMatchService,
  getUserMatchStateService,
  cancelMatchService,
  respondMatchProposalService,
} from "../services/matchmaking.service";
import { leaveDirectRoomService } from "@/modules/rooms/services/participation/leave-direct-room.service";
import { getMatchPeerPreview } from "../services/match-peer-preview.service";
import { ensureUserBlocksSyncedForMatching } from "@/modules/blocks/services/block-user.service";
import { assertGuestReadyForMatchSearch } from "@/modules/guest";
import { assertMatchPrepReadyForSearch,
  MatchPrepNotReadyError,
} from "@/modules/profile/services/match-prep.service";
import logger from "@/core/logging";
import { AppError } from "@/shared/errors";

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

    if (currentState.status === "proposed" && currentState.requestId) {
      logger.info("[handleFindMatch] idempotent — match proposal active", { userId, requestId: currentState.requestId });
      return c.json(
        ApiResponse.success(
          {
            requestId: currentState.requestId,
            status: "proposed",
            peerUserId: currentState.peerUserId,
            matchScore: currentState.matchScore,
            isFallbackMatch: currentState.isFallbackMatch,
          },
          "Match proposal active",
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

    await assertGuestReadyForMatchSearch(userId);
    await assertMatchPrepReadyForSearch(userId);
    await ensureUserBlocksSyncedForMatching(userId);

    const engineResponse = await findMatchService(userId, requestId);
    logger.info("[handleFindMatch] engine response", { userId, requestId, engineData: engineResponse.data });

    const engineData = engineResponse.data as Record<string, unknown>;
    const effectiveRequestId =
      typeof engineData.requestId === "string" ? engineData.requestId : requestId;

    return c.json(
      ApiResponse.success(
        { requestId: effectiveRequestId, ...engineResponse.data },
        "Matchmaking started",
        200
      ),
      200
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    if (error instanceof MatchPrepNotReadyError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: 409,
          code: "ACTIVITY_PREP_INCOMPLETE",
        }),
        409,
      );
    }
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
export const handleRespondMatchProposal = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json(
        ApiResponse.error({ message: "Invalid JSON body", statusCode: 400, code: "VALIDATION_ERROR" }),
        400
      );
    }
    const record = body as Record<string, unknown>;
    const attemptId = typeof record.attemptId === "string" ? record.attemptId.trim() : "";
    const decision = record.decision === "connect" || record.decision === "skip" ? record.decision : null;

    if (!attemptId || !decision) {
      return c.json(
        ApiResponse.error({
          message: "attemptId and decision (connect|skip) are required",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400
      );
    }

    await respondMatchProposalService(userId, attemptId, decision);
    return c.json(ApiResponse.success(null, "Recorded", 200), 200);
  } catch (error) {
    logger.error("[handleRespondMatchProposal] failed", { error });
    return internalError(c, error, "MATCH_RESPOND_FAILED");
  }
};

export const handleLeaveRoom = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    let explicitRoomId: string | undefined;
    try {
      const body = (await c.req.json()) as { roomId?: unknown };
      if (typeof body.roomId === "string" && body.roomId.trim().length > 0) {
        explicitRoomId = body.roomId.trim();
      }
    } catch {
      /* empty body is fine — falls back to active RTC room id */
    }
    logger.info("[handleLeaveRoom] request received", { userId, explicitRoomId: explicitRoomId ?? null });
    await leaveDirectRoomService(userId, explicitRoomId);
    return c.json(ApiResponse.success(null, "Left room", 200), 200);
  } catch (error) {
    logger.error("[handleLeaveRoom] failed", { error });
    return internalError(c, error, "LEAVE_ROOM_FAILED");
  }
};

/** GET /matching/peer-preview/:peerUserId — card data for “Match found” UI (Redis profile snapshot). */
export const handleGetMatchPeerPreview = async (c: Context) => {
  try {
    const peerUserId = decodeURIComponent(c.req.param("peerUserId") ?? "").trim();
    if (!peerUserId) {
      return c.json(
        ApiResponse.error({ message: "peerUserId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
        400
      );
    }

    const userId = c.get("userId") as string;
    const preview = await getMatchPeerPreview(userId, peerUserId);
    if (!preview) {
      return c.json(
        ApiResponse.error({ message: "Peer unavailable", statusCode: 404, code: "NOT_FOUND" }),
        404,
      );
    }
    return c.json(ApiResponse.success(preview, "Peer preview", 200), 200);
  } catch (error) {
    logger.error("[handleGetMatchPeerPreview] failed", { error });
    return internalError(c, error, "PEER_PREVIEW_FAILED");
  }
};
