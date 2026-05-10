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

export const healthResponse = async (c: Context): Promise<Response> => {
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
