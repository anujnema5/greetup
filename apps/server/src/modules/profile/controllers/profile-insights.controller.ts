import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";

import { getProfileInsightsService } from "../services/get-profile-insights.service";
import { profileInsightsQuerySchema } from "../schemas/profile-insights.query.schema";

export async function handleGetProfileInsights(c: Context) {
  try {
    const userId = c.get("userId") as string;
    const parsed = profileInsightsQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: "Invalid query parameters",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }

    const insights = await getProfileInsightsService(userId, {
      recentLimit: parsed.data.recentLimit,
    });
    return c.json(ApiResponse.success(insights, "Profile insights retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("Get profile insights error", { error });
    return internalError(c, error, "GET_PROFILE_INSIGHTS_FAILED");
  }
}
