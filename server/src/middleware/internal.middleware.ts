import type { Context, Next } from "hono";
import { ApiResponse } from "@/shared/responses";

export const internalMiddleware = async (c: Context, next: Next) => {
  const key = c.req.header("x-internal-api-key");

  if (!process.env.INTERNAL_API_KEY || key !== process.env.INTERNAL_API_KEY) {
    return c.json(
      ApiResponse.error({ message: "Forbidden", statusCode: 403, code: "UNAUTHORIZED" }),
      403
    );
  }

  await next();
};
