import type { MiddlewareHandler } from "hono";

import { env } from "@/config/env";

/** Validates `x-internal-api-key` when `INTERNAL_API_KEY` is set (server ↔ matching-service convention). */
export const internalApiGuard: MiddlewareHandler = async (c, next) => {
  const key = c.req.header("x-internal-api-key") ?? "";
  if (env.internalApiKey && key !== env.internalApiKey) {
    return c.json({ ok: false as const, error: "unauthorized" }, 403);
  }
  await next();
};
