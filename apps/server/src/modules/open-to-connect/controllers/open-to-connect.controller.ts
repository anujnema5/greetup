import type { Context } from "hono";

import { ApiResponse, internalError } from "@/shared/responses";
import { AppError } from "@/shared/errors";
import logger from "@/core/logging";
import { ActivitySelectionValidationError } from "@/modules/session-activities";

import { enableOpenToConnectBodySchema } from "../schemas/enable-open-to-connect.schema";
import {
  disableOpenToConnectService,
  enableOpenToConnectService,
  getOpenToConnectMeService,
} from "../services/open-to-connect.service";
import {
  getOpenToConnectFeedService,
  getOpenToConnectSearchSuggestionsService,
  getOpenToConnectSidebarService,
} from "../services/open-to-connect-feed.service";

function parseFeedQuery(c: Context) {
  const activityId = c.req.query("activityId")?.trim() || undefined;
  const interestId = c.req.query("interestId")?.trim() || undefined;
  const cursor = c.req.query("cursor")?.trim() || undefined;
  const limitRaw = c.req.query("limit");
  const limit =
    limitRaw != null && limitRaw.trim() !== "" ? Number.parseInt(limitRaw, 10) : undefined;
  return {
    activityId,
    interestId,
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  };
}

export const handleEnableOpenToConnect = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    const parsed = enableOpenToConnectBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: parsed.error.issues[0]?.message ?? "Invalid request body",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }

    const result = await enableOpenToConnectService(userId, parsed.data);
    return c.json(ApiResponse.success(result, "Open to connect enabled", 200), 200);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 409 | 503,
      );
    }
    if (error instanceof ActivitySelectionValidationError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }
    logger.error("[handleEnableOpenToConnect] failed", { error });
    return internalError(c, error, "OTC_ENABLE_FAILED");
  }
};

export const handleDisableOpenToConnect = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const result = await disableOpenToConnectService(userId);
    return c.json(ApiResponse.success(result, "Open to connect disabled", 200), 200);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 400 | 409,
      );
    }
    logger.error("[handleDisableOpenToConnect] failed", { error });
    return internalError(c, error, "OTC_DISABLE_FAILED");
  }
};

export const handleGetOpenToConnectMe = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const result = await getOpenToConnectMeService(userId);
    return c.json(ApiResponse.success(result, "Open to connect status", 200), 200);
  } catch (error) {
    logger.error("[handleGetOpenToConnectMe] failed", { error });
    return internalError(c, error, "OTC_ME_FAILED");
  }
};

export const handleGetOpenToConnectFeed = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const result = await getOpenToConnectFeedService(userId, parseFeedQuery(c));
    return c.json(ApiResponse.success(result, "Open now feed", 200), 200);
  } catch (error) {
    logger.error("[handleGetOpenToConnectFeed] failed", { error });
    return internalError(c, error, "OTC_FEED_FAILED");
  }
};

export const handleGetOpenToConnectSidebar = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const query = parseFeedQuery(c);
    const result = await getOpenToConnectSidebarService(userId, {
      activityId: query.activityId,
      interestId: query.interestId,
    });
    return c.json(ApiResponse.success(result, "Open now sidebar", 200), 200);
  } catch (error) {
    logger.error("[handleGetOpenToConnectSidebar] failed", { error });
    return internalError(c, error, "OTC_SIDEBAR_FAILED");
  }
};

export const handleGetOpenToConnectSearchSuggestions = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    if (c.get("isGuest") === true) {
      return c.json(
        ApiResponse.success(
          { items: [], nextCursor: null, limit: 5 },
          "Search suggestions unavailable for guest accounts",
          200,
        ),
        200,
      );
    }
    const result = await getOpenToConnectSearchSuggestionsService(userId);
    return c.json(ApiResponse.success(result, "Open now search suggestions", 200), 200);
  } catch (error) {
    if (error instanceof AppError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode as 409,
      );
    }
    logger.error("[handleGetOpenToConnectSearchSuggestions] failed", { error });
    return internalError(c, error, "OTC_SEARCH_SUGGESTIONS_FAILED");
  }
};
