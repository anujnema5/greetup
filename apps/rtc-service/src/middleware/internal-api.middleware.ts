import type { MiddlewareHandler } from "hono";

import { env } from "@/shared/config/env";

export const internalApiGuard: MiddlewareHandler = async (c, next) => {
  const key = c.req.header("x-internal-api-key") ?? "";
  if (env.internalApiKey && key !== env.internalApiKey) {
    return c.json({ ok: false as const, error: "unauthorized" }, 403);
  }
  await next();
};
