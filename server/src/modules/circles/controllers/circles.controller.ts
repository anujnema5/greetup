import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { createCircleBodySchema } from "../schemas/create-circle.schema";
import { updateScheduledCircleBodySchema } from "../schemas/update-scheduled-circle.schema";
import { createCircleService } from "../services/create-circle.service";
import { deleteScheduledCircleService } from "../services/delete-scheduled-circle.service";
import { listActiveCirclesService } from "../services/list-active-circles.service";
import { listCircleCategoriesService } from "../services/list-categories.service";
import { updateScheduledCircleService } from "../services/update-scheduled-circle.service";
import { CreateCircleError } from "../types/create-circle.types";
import { DeleteScheduledCircleError } from "../types/delete-scheduled-circle.types";
import { UpdateScheduledCircleError } from "../types/update-scheduled-circle.types";

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

export const handleDeleteScheduledCircle = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const roomId = c.req.param("roomId");
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

    const result = await deleteScheduledCircleService(userId, roomId);
    return c.json(ApiResponse.success(result, "Circle cancelled", 200), 200);
  } catch (error: unknown) {
    if (error instanceof DeleteScheduledCircleError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode,
      );
    }
    logger.error("Delete scheduled circle error", { error });
    return internalError(c, error, "DELETE_SCHEDULED_CIRCLE_FAILED");
  }
};

export const handlePatchScheduledCircle = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const roomId = c.req.param("roomId");
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

    const body = await c.req.json();
    const parsed = updateScheduledCircleBodySchema.safeParse(body);
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

    const result = await updateScheduledCircleService(userId, roomId, parsed.data);
    return c.json(ApiResponse.success(result, "Circle updated", 200), 200);
  } catch (error: unknown) {
    if (error instanceof UpdateScheduledCircleError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode,
      );
    }
    logger.error("Update scheduled circle error", { error });
    return internalError(c, error, "UPDATE_SCHEDULED_CIRCLE_FAILED");
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
