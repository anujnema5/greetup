import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";
import {
  usernameCheckQuerySchema,
  usernameSuggestionsQuerySchema,
} from "../schemas/username.schema";
import {
  checkUsernameAvailabilityService,
  suggestUsernamesService,
} from "../services/username-suggestions.service";

export const handleCheckUsername = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const parsed = usernameCheckQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: "Invalid query",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors: zodFieldErrorsItems(parsed.error),
        }),
        400,
      );
    }

    const result = await checkUsernameAvailabilityService({
      userId,
      username: parsed.data.username,
    });

    return c.json(ApiResponse.success(result, "Username checked", 200), 200);
  } catch (error: unknown) {
    logger.error("Check username error", { error });
    return internalError(c, error, "CHECK_USERNAME_FAILED");
  }
};

export const handleSuggestUsernames = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const parsed = usernameSuggestionsQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(
        ApiResponse.error({
          message: "Invalid query",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors: zodFieldErrorsItems(parsed.error),
        }),
        400,
      );
    }

    const result = await suggestUsernamesService({
      userId,
      vibe: parsed.data.vibe,
      limit: parsed.data.limit,
    });

    return c.json(ApiResponse.success(result, "Username suggestions", 200), 200);
  } catch (error: unknown) {
    logger.error("Suggest usernames error", { error });
    return internalError(c, error, "SUGGEST_USERNAMES_FAILED");
  }
};
