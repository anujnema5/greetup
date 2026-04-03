import type { Context } from "hono";

import logger from "@/core/logging";
import { CLIENT_SAFE_INTERNAL_MESSAGE } from "@/shared/messages";
import { ApiResponse } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { createCircleBodySchema } from "../schemas/create-circle.schema";
import { createCircleService, CreateCircleError } from "../services/create-circle.service";
import { listCircleCategoriesService } from "../services/list-categories.service";

export const handleListCircleCategories = async (c: Context) => {
  try {
    const categories = await listCircleCategoriesService();
    return c.json(
      ApiResponse.success({ categories }, "Circle categories retrieved", 200),
      200,
    );
  } catch (error: unknown) {
    logger.error("List circle categories error", { error });
    return c.json(
      ApiResponse.error({
        message: CLIENT_SAFE_INTERNAL_MESSAGE,
        statusCode: 500,
        code: "LIST_CIRCLE_CATEGORIES_FAILED",
      }),
      500,
    );
  }
};

export const handleCreateCircle = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();
    const parsed = createCircleBodySchema.safeParse(body);

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

    const result = await createCircleService(userId, parsed.data);

    return c.json(
      ApiResponse.success(result, "Circle created", 201),
      201,
    );
  } catch (error: unknown) {
    if (error instanceof CreateCircleError) {
      const status = error.code === "CATEGORY_NOT_FOUND" ? 404 : 400;
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: status,
          code: error.code,
        }),
        status,
      );
    }
    logger.error("Create circle error", { error });
    return c.json(
      ApiResponse.error({
        message: CLIENT_SAFE_INTERNAL_MESSAGE,
        statusCode: 500,
        code: "CREATE_CIRCLE_FAILED",
      }),
      500,
    );
  }
};
