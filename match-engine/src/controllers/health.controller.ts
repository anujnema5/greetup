import { APP_CONFIG } from "@/config/constants";
import { env } from "@/config/env";
import { pingRedis } from "@/redis/client";

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

export const healthResponse = async (): Promise<Response> => {
  const redisOk = await withTimeout(pingRedis(), env.redisPingTimeoutMs).catch(() => false);
  const statusCode = redisOk ? 200 : 503;

  return Response.json({
    ok: redisOk,
    service: APP_CONFIG.serviceName,
    redis: redisOk ? "up" : "down",
    ts: Date.now(),
  }, { status: statusCode });
};
