import type { Context } from "hono";
import { z } from "zod";

import { ApiResponse, internalError } from "@/shared/responses";
import logger from "@/core/logging";
import { zodBodyValidationError } from "@/modules/rooms/lib/http-responses";
import {
  createDirectRoomChessInvite,
  DirectRoomChessError,
  endDirectRoomChessGame,
  moveDirectRoomChessGame,
  offerDirectRoomChessDraw,
  respondDirectRoomChessDraw,
  respondDirectRoomChessInvite,
} from "@/modules/rooms/services/chess-activity.service";
import {
  chessDrawOfferBodySchema,
  chessDrawRespondBodySchema,
  chessEndBodySchema,
  chessInviteBodySchema,
  chessMoveBodySchema,
  chessRespondBodySchema,
} from "@/modules/rooms/schemas/room-activity.schema";

type RoomParamResult = { roomId: string } | { response: Response };

function requireRoomId(c: Context): RoomParamResult {
  const roomId = c.req.param("roomId");
  if (!roomId) {
    return {
      response: c.json(
        ApiResponse.error({ message: "roomId is required", statusCode: 400, code: "VALIDATION_ERROR" }),
        400,
      ),
    };
  }
  return { roomId };
}

async function parseValidatedBody<T>(
  c: Context,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { response: Response }> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    body = {};
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { response: zodBodyValidationError(c, parsed.error) };
  }
  return { data: parsed.data };
}

function chessDomainErrorResponse(c: Context, error: DirectRoomChessError): Response {
  return c.json(
    ApiResponse.error({
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    }),
    error.statusCode as 400 | 403 | 404 | 409,
  );
}

function logAndReturnInternalError(c: Context, error: unknown, message: string): Response {
  logger.error(message, { error });
  return internalError(c, error);
}

/**
 * POST /api/room/:roomId/activity/chess/invite
 * Current direct-call participant asks the peer to start chess.
 */
export const handleChessInvite = async (c: Context) => {
  const roomParam = requireRoomId(c);
  if ("response" in roomParam) return roomParam.response;

  const parsedBody = await parseValidatedBody(c, chessInviteBodySchema);
  if ("response" in parsedBody) return parsedBody.response;

  const { roomId } = roomParam;
  const userId = c.get("userId") as string;

  try {
    const data = await createDirectRoomChessInvite(roomId, userId);
    return c.json(ApiResponse.success(data, "Chess invite sent", 200), 200);
  } catch (error: unknown) {
    if (error instanceof DirectRoomChessError) {
      return chessDomainErrorResponse(c, error);
    }
    return logAndReturnInternalError(c, error, "Create chess invite error");
  }
};

/**
 * POST /api/room/:roomId/activity/chess/respond
 * Invitee accepts or declines a pending direct-call chess invite.
 */
export const handleChessRespond = async (c: Context) => {
  const roomParam = requireRoomId(c);
  if ("response" in roomParam) return roomParam.response;

  const parsedBody = await parseValidatedBody(c, chessRespondBodySchema);
  if ("response" in parsedBody) return parsedBody.response;

  const { roomId } = roomParam;
  const { requestId, accept } = parsedBody.data;
  const userId = c.get("userId") as string;

  try {
    const data = await respondDirectRoomChessInvite(roomId, requestId, userId, accept);
    return c.json(ApiResponse.success(data, data.started ? "Chess started" : "Chess invite declined", 200), 200);
  } catch (error: unknown) {
    if (error instanceof DirectRoomChessError) {
      return chessDomainErrorResponse(c, error);
    }
    return logAndReturnInternalError(c, error, "Respond chess invite error");
  }
};

/**
 * POST /api/room/:roomId/activity/chess/end
 * Ends the active direct-call chess game for both peers.
 */
export const handleChessEnd = async (c: Context) => {
  const roomParam = requireRoomId(c);
  if ("response" in roomParam) return roomParam.response;

  const parsedBody = await parseValidatedBody(c, chessEndBodySchema);
  if ("response" in parsedBody) return parsedBody.response;

  const { roomId } = roomParam;
  const { gameId } = parsedBody.data;
  const userId = c.get("userId") as string;

  try {
    const data = await endDirectRoomChessGame(roomId, gameId, userId);
    return c.json(ApiResponse.success(data, "Chess ended", 200), 200);
  } catch (error: unknown) {
    if (error instanceof DirectRoomChessError) {
      return chessDomainErrorResponse(c, error);
    }
    return logAndReturnInternalError(c, error, "End chess game error");
  }
};

/**
 * POST /api/room/:roomId/activity/chess/move
 * Applies a validated move and syncs it to both players.
 */
export const handleChessMove = async (c: Context) => {
  const roomParam = requireRoomId(c);
  if ("response" in roomParam) return roomParam.response;

  const parsedBody = await parseValidatedBody(c, chessMoveBodySchema);
  if ("response" in parsedBody) return parsedBody.response;

  const { roomId } = roomParam;
  const userId = c.get("userId") as string;

  try {
    const { gameId, ...move } = parsedBody.data;
    const data = await moveDirectRoomChessGame(roomId, gameId, userId, move);
    return c.json(ApiResponse.success(data, "Chess move applied", 200), 200);
  } catch (error: unknown) {
    if (error instanceof DirectRoomChessError) {
      return chessDomainErrorResponse(c, error);
    }
    return logAndReturnInternalError(c, error, "Move chess game error");
  }
};

export const handleChessDrawOffer = async (c: Context) => {
  const roomParam = requireRoomId(c);
  if ("response" in roomParam) return roomParam.response;
  const parsedBody = await parseValidatedBody(c, chessDrawOfferBodySchema);
  if ("response" in parsedBody) return parsedBody.response;
  const { roomId } = roomParam;
  const userId = c.get("userId") as string;
  try {
    const data = await offerDirectRoomChessDraw(roomId, parsedBody.data.gameId, userId);
    return c.json(ApiResponse.success(data, "Draw offer sent", 200), 200);
  } catch (error: unknown) {
    if (error instanceof DirectRoomChessError) return chessDomainErrorResponse(c, error);
    return logAndReturnInternalError(c, error, "Offer chess draw error");
  }
};

export const handleChessDrawRespond = async (c: Context) => {
  const roomParam = requireRoomId(c);
  if ("response" in roomParam) return roomParam.response;
  const parsedBody = await parseValidatedBody(c, chessDrawRespondBodySchema);
  if ("response" in parsedBody) return parsedBody.response;
  const { roomId } = roomParam;
  const userId = c.get("userId") as string;
  try {
    const data = await respondDirectRoomChessDraw(
      roomId,
      parsedBody.data.gameId,
      userId,
      parsedBody.data.accept,
    );
    return c.json(ApiResponse.success(data, data.accepted ? "Draw accepted" : "Draw rejected", 200), 200);
  } catch (error: unknown) {
    if (error instanceof DirectRoomChessError) return chessDomainErrorResponse(c, error);
    return logAndReturnInternalError(c, error, "Respond chess draw error");
  }
};
