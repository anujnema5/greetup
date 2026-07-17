import type { Context } from "hono";
import { APP_CONFIG } from "@/shared/config/constants";
import { env } from "@/shared/config/env";
import { pingRedis } from "@/core/redis/client";

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

/**
 * Liveness for App Platform / load balancers.
 * Always 200 while the process can serve HTTP — Redis flaps must not yank the
 * instance (that surfaces as DO `via_upstream` 503/504 to the API).
 * Redis status is reported in the body; use `/ready` for dependency checks.
 */
export const healthResponse = async (c: Context): Promise<Response> => {
  const redisOk = await withTimeout(pingRedis(), env.redisPingTimeoutMs).catch(() => false);

  return c.json(
    {
      ok: true,
      service: APP_CONFIG.serviceName,
      redis: redisOk ? "up" : "down",
      ts: Date.now(),
    },
    200,
  );
};

/** Readiness — Redis must respond. */
export const readyResponse = async (c: Context): Promise<Response> => {
  const redisOk = await withTimeout(pingRedis(), env.redisPingTimeoutMs).catch(() => false);

  return c.json(
    {
      ok: redisOk,
      service: APP_CONFIG.serviceName,
      redis: redisOk ? "up" : "down",
      ts: Date.now(),
    },
    redisOk ? 200 : 503,
  );
};
