import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { suggestPeopleQuerySchema } from "../schemas/suggest-people.query.schema";
import { suggestPeopleService } from "../services/suggest-people.service";

export const handleSuggestPeople = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const parsed = suggestPeopleQuerySchema.safeParse(c.req.query());

    if (!parsed.success) {
      const errors = zodFieldErrorsItems(parsed.error);
      return c.json(
        ApiResponse.error({
          message: "Invalid query parameters",
          statusCode: 400,
          code: "VALIDATION_ERROR",
          errors,
        }),
        400,
      );
    }

    const { page, limit } = parsed.data;
    const result = await suggestPeopleService(userId, page, limit);

    return c.json(ApiResponse.success(result, "OK", 200), 200);
  } catch (error: unknown) {
    logger.error("Suggest people error", { error });
    return internalError(c, error, "SUGGEST_PEOPLE_FAILED");
  }
};
