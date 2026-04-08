import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";
import { matchPrepSaveBodySchema } from "../schemas/match-prep.schema";
import {
  getMatchPrepCurrentService,
  getMatchPrepOptionsService,
  getMatchPrepPromptStatusService,
  saveMatchPrepService,
} from "../services/match-prep.service";

export const handleGetMatchPrepCurrent = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const data = await getMatchPrepCurrentService(userId);
    return c.json(ApiResponse.success(data, "Match prep current", 200), 200);
  } catch (error: unknown) {
    logger.error("Get match prep current error", { error });
    return internalError(c, error, "MATCH_PREP_CURRENT_FAILED");
  }
};

export const handleGetMatchPrepOptions = async (c: Context) => {
  try {
    const data = await getMatchPrepOptionsService();
    return c.json(ApiResponse.success(data, "Match prep options", 200), 200);
  } catch (error: unknown) {
    logger.error("Get match prep options error", { error });
    return internalError(c, error, "MATCH_PREP_OPTIONS_FAILED");
  }
};

export const handleGetMatchPrepPromptStatus = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const clientSessionId = c.req.query("clientSessionId")?.trim();
    if (!clientSessionId) {
      return c.json(
        ApiResponse.error({
          message: "clientSessionId query parameter is required",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }
    const data = await getMatchPrepPromptStatusService(userId, clientSessionId);
    return c.json(ApiResponse.success(data, "Match prep prompt status", 200), 200);
  } catch (error: unknown) {
    logger.error("Get match prep prompt status error", { error });
    return internalError(c, error, "MATCH_PREP_PROMPT_STATUS_FAILED");
  }
};

export const handleSaveMatchPrep = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();
    const parsed = matchPrepSaveBodySchema.safeParse(body);

    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }

    await saveMatchPrepService(userId, parsed.data);
    return c.json(ApiResponse.success({ ok: true }, "Match prep saved", 200), 200);
  } catch (error: unknown) {
    logger.error("Save match prep error", { error });
    return internalError(c, error, "MATCH_PREP_SAVE_FAILED");
  }
};
