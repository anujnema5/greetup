import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { browseNicheRoomsQuerySchema } from "../schemas/browse-niche-rooms.query.schema";
import { listBrowseNicheRoomsService, BrowseNicheRoomsError } from "../services/list-browse-niche-rooms.service";
import { listBrowseNichesService } from "../services/list-browse-niches.service";

export const handleListBrowseNiches = async (c: Context) => {
  try {
    const result = await listBrowseNichesService();
    return c.json(ApiResponse.success(result, "Browse niches retrieved", 200), 200);
  } catch (error: unknown) {
    logger.error("List browse niches error", { error });
    return internalError(c, error, "LIST_BROWSE_NICHES_FAILED");
  }
};

export const handleListBrowseNicheRooms = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const categoryId = c.req.param("categoryId");
    if (!categoryId) {
      return c.json(
        ApiResponse.error({
          message: "categoryId is required",
          statusCode: 400,
          code: "VALIDATION_ERROR",
        }),
        400,
      );
    }

    const parsed = browseNicheRoomsQuerySchema.safeParse(c.req.query());
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

    const { limit, cursor } = parsed.data;
    const result = await listBrowseNicheRoomsService(userId, categoryId, limit, cursor);

    return c.json(ApiResponse.success(result, "Niche rooms retrieved", 200), 200);
  } catch (error: unknown) {
    if (error instanceof BrowseNicheRoomsError) {
      return c.json(
        ApiResponse.error({
          message: error.message,
          statusCode: error.statusCode,
          code: error.code,
        }),
        error.statusCode,
      );
    }
    logger.error("List browse niche rooms error", { error });
    return internalError(c, error, "LIST_BROWSE_NICHE_ROOMS_FAILED");
  }
};
