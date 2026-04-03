import type { Context } from "hono";

import logger from "@/core/logging";
import { ApiResponse, internalError } from "@/shared/responses";
import { zodFieldErrorsItems } from "@/shared/validation";

import { listConnectionsQuerySchema } from "../schemas/connections-list.query.schema";
import { listMyConnectionsService } from "../services/list-my-connections.service";

export const handleListMyConnections = async (c: Context) => {
  try {
    const userId = c.get("userId") as string;
    const query = c.req.query();
    const parsed = listConnectionsQuerySchema.safeParse({
      filter: query.filter,
      page: query.page,
      limit: query.limit,
      q: query.q,
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

    const result = await listMyConnectionsService(userId, parsed.data);

    return c.json(
      ApiResponse.success(result, "Connections retrieved", 200),
      200,
    );
  } catch (error: unknown) {
    logger.error("List connections error", { error });
    return internalError(c, error, "LIST_CONNECTIONS_FAILED");
  }
};
