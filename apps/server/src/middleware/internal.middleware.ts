import type { Context, Next } from "hono";

import { ApiResponse } from "@/shared/responses";
import config from "@/shared/config/config";

export const internalMiddleware = async (c: Context, next: Next) => {
  const key = c.req.header("x-internal-api-key");
  const expected = config.internalApiKey;

  if (!expected || key !== expected) {
    return c.json(
      ApiResponse.error({ message: "Forbidden", statusCode: 403, code: "UNAUTHORIZED" }),
      403
    );
  }

  await next();
};
