import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { createCircleBodySchema } from "../schemas/create-circle.schema";
import { createCircleService } from "../services/create-circle.service";
import { CreateCircleError } from "../types/create-circle.types";
import { listCircleCategoriesService } from "../services/list-categories.service";
import { listActiveCirclesService } from "../services/list-active-circles.service";

export const handleListActiveCircles = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const cursorParam = c.req.query("cursor");
    const limitParam = c.req.query("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10;
    const cursor = cursorParam || undefined;

    const result = await listActiveCirclesService(userId, limit, cursor);
    return c.json(ApiResponse.success(result, "Active circles retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("List active circles error", { error });
    return internalError(c, error, "LIST_ACTIVE_CIRCLES_FAILED");
  }
};

export const handleListCircleCategories = async (c: Context) => {
  try {
    const categories = await listCircleCategoriesService();
    return c.json(
      ApiResponse.success({ categories }, "Circle categories retrieved", 200),
      200,
    );
  } catch (error: unknown) {
    logger.error("List circle categories error", { error });
    return internalError(c, error, "LIST_CIRCLE_CATEGORIES_FAILED");
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
      ApiResponse.success(result, "Room created", 201),
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
    return internalError(c, error, "CREATE_CIRCLE_FAILED");
  }
};
