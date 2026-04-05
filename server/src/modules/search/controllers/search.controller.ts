import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { searchUsersQuerySchema } from "../schemas/search-users.query.schema";
import { searchUsersService } from "../services/search-users.service";

export const handleSearchUsers = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const parsed = searchUsersQuerySchema.safeParse({
      q: c.req.query("q"),
      limit: c.req.query("limit"),
    });

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

    const { q, limit } = parsed.data;
    const result = await searchUsersService(userId, q, limit);

    return c.json(ApiResponse.success(result, "OK", 200), 200);
  } catch (error: unknown) {
    logger.error("Search users error", { error });
    return internalError(c, error, "SEARCH_USERS_FAILED");
  }
};
