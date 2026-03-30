import type { Context } from "hono";

import { ApiResponse } from "@/shared/responses";

/** Shared 400 for Zod failures on inbound JSON (same shape as before). */
export const invalidRequestBody = (c: Context) =>
  c.json(
    ApiResponse.error({ message: "Invalid request body", statusCode: 400, code: "VALIDATION_ERROR" }),
    400
  );

/** Shared 500 for unexpected handler failures in room webhooks. */
export const internalError = (c: Context) =>
  c.json(
    ApiResponse.error({ message: "Internal error", statusCode: 500, code: "INTERNAL_ERROR" }),
    500
  );
