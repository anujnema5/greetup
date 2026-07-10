import type { MiddlewareHandler } from "hono";

import { corsOptions } from "@/http/cors";
import { AppError } from "@/shared/errors";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedOrigins(): Set<string> {
  const origin = corsOptions.origin;
  const list = Array.isArray(origin) ? origin : origin ? [origin] : [];
  return new Set(list.filter(Boolean));
}

function requestOrigin(c: {
  req: { header: (name: string) => string | undefined };
}): string | null {
  const origin = c.req.header("origin")?.trim();
  if (origin) return origin;

  const referer = c.req.header("referer")?.trim();
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF defense-in-depth for cookie-authenticated mutating API calls.
 * When the browser sends Origin/Referer, it must match the CORS allowlist.
 * Requests with no Origin/Referer (non-browser) are allowed.
 */
export const requireAllowedOrigin: MiddlewareHandler = async (c, next) => {
  if (!MUTATING.has(c.req.method.toUpperCase())) {
    await next();
    return;
  }

  const origin = requestOrigin(c);
  if (!origin) {
    await next();
    return;
  }

  if (!allowedOrigins().has(origin)) {
    throw new AppError("Forbidden origin", 403, "UNAUTHORIZED");
  }

  await next();
};
