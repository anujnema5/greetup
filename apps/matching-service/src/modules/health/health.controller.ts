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

async function probeRedis(): Promise<boolean> {
  return withTimeout(pingRedis(), env.redisPingTimeoutMs).catch(() => false);
}

function healthBody(redisOk: boolean, ok: boolean) {
  return {
    ok,
    service: APP_CONFIG.serviceName,
    redis: redisOk ? ("up" as const) : ("down" as const),
    ts: Date.now(),
  };
}

/**
 * Liveness for App Platform / load balancers.
 * Always 200 while the process can serve HTTP — Redis flaps must not yank the
 * instance (that surfaces as DO `via_upstream` 503/504 to the API).
 * Redis status is reported in the body; use `/ready` for dependency checks.
 */
export const healthResponse = async (c: Context): Promise<Response> => {
  const redisOk = await probeRedis();
  return c.json(healthBody(redisOk, true), 200);
};

/** Readiness — Redis must respond. */
export const readyResponse = async (c: Context): Promise<Response> => {
  const redisOk = await probeRedis();
  return c.json(healthBody(redisOk, redisOk), redisOk ? 200 : 503);
};
