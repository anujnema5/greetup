import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { RoomActivityError } from "@/modules/rooms/services/activity/room-activity.service";
import { getNextConversationCueService } from "@/modules/rooms/services/conversation-cues/conversation-cues.service";

function roomActivityErrorResponse(c: Context, error: RoomActivityError): Response {
  return c.json(
    ApiResponse.error({
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
    }),
    error.statusCode as 400 | 403 | 404,
  );
}

/**
 * GET /api/room/:roomId/conversation-cues
 * Next unseen overlap hint for this direct call (session activities, interests, moods, …).
 */
export const handleGetConversationCues = async (c: Context) => {
  const roomId = c.req.param("roomId")?.trim();
  if (!roomId) {
    return c.json(
      ApiResponse.error({
        message: "roomId is required",
        statusCode: 400,
        code: "VALIDATION_ERROR",
      }),
      400,
    );
  }

  try {
    const userId = c.get("userId") as string;
    const result = await getNextConversationCueService(userId, roomId);
    return c.json(ApiResponse.success(result, "Conversation cue", 200), 200);
  } catch (error) {
    if (error instanceof RoomActivityError) {
      return roomActivityErrorResponse(c, error);
    }
    logger.error("[handleGetConversationCues] failed", { error, roomId });
    return internalError(c, error, "CONVERSATION_CUES_FAILED");
  }
};
