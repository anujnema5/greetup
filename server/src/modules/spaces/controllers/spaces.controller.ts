import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { createSpaceBodySchema } from "../schemas/create-space.schema";
import { updateScheduledSpaceBodySchema } from "../schemas/update-scheduled-space.schema";
import { createSpaceService } from "../services/create-space.service";
import { deleteScheduledSpaceService } from "../services/delete-scheduled-space.service";
import { listActiveSpacesService } from "../services/list-active-spaces.service";
import { listSpaceCategoriesService } from "../services/list-categories.service";
import { updateScheduledSpaceService } from "../services/update-scheduled-space.service";
import { CreateSpaceError } from "../types/create-space.types";
import { DeleteScheduledSpaceError } from "../types/delete-scheduled-space.types";
import { UpdateScheduledSpaceError } from "../types/update-scheduled-space.types";

export const handleListActiveSpaces = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const cursorParam = c.req.query("cursor");
    const limitParam = c.req.query("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10;
    const cursor = cursorParam || undefined;

    const result = await listActiveSpacesService(userId, limit, cursor);
    return c.json(ApiResponse.success(result, "Active spaces retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("List active spaces error", { error });
    return internalError(c, error, "LIST_ACTIVE_SPACES_FAILED");
  }
};

export const handleListSpaceCategories = async (c: Context) => {
  try {
    const categories = await listSpaceCategoriesService();
    return c.json(
      ApiResponse.success({ categories }, "Space categories retrieved", 200),
      200,
    );
  } catch (error: unknown) {
    logger.error("List space categories error", { error });
    return internalError(c, error, "LIST_SPACE_CATEGORIES_FAILED");
  }
};

export const handleDeleteScheduledSpace = async (c: Context) => {
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

    const result = await deleteScheduledSpaceService(userId, roomId);
    return c.json(ApiResponse.success(result, "Space cancelled", 200), 200);
  } catch (error: unknown) {
    if (error instanceof DeleteScheduledSpaceError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode,
      );
    }
    logger.error("Delete scheduled space error", { error });
    return internalError(c, error, "DELETE_SCHEDULED_SPACE_FAILED");
  }
};

export const handlePatchScheduledSpace = async (c: Context) => {
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
    const parsed = updateScheduledSpaceBodySchema.safeParse(body);
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

    const result = await updateScheduledSpaceService(userId, roomId, parsed.data);
    return c.json(ApiResponse.success(result, "Space updated", 200), 200);
  } catch (error: unknown) {
    if (error instanceof UpdateScheduledSpaceError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode,
      );
    }
    logger.error("Update scheduled space error", { error });
    return internalError(c, error, "UPDATE_SCHEDULED_SPACE_FAILED");
  }
};

export const handleCreateSpace = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const body = await c.req.json();
    const parsed = createSpaceBodySchema.safeParse(body);

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

    const result = await createSpaceService(userId, parsed.data);

    return c.json(
      ApiResponse.success(result, "Room created", 201),
      201,
    );
  } catch (error: unknown) {
    if (error instanceof CreateSpaceError) {
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
    logger.error("Create space error", { error });
    return internalError(c, error, "CREATE_SPACE_FAILED");
  }
};
