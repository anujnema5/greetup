import type { Context } from "hono";

import { CLIENT_SAFE_INTERNAL_MESSAGE } from "@/shared/messages";
import { ApiResponse } from "@/shared/responses";

/** Shared 400 for Zod failures on inbound JSON (same shape as before). */
export const invalidRequestBody = (c: Context) =>
  c.json(
    ApiResponse.error({ message: "Invalid request body", statusCode: 400, code: "VALIDATION_ERROR" }),
    400
  );

/** Shared 500 for unexpected handler failures (rooms, internal webhooks, etc.). */
export const internalError = (c: Context) =>
  c.json(
    ApiResponse.error({
      message: CLIENT_SAFE_INTERNAL_MESSAGE,
      statusCode: 500,
      code: "INTERNAL_ERROR",
    }),
    500
  );
