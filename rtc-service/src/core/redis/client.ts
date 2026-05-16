import Redis from "ioredis";
import { env } from "@/shared/config/env";
import { logger } from "@/core/logging";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) throw new Error("Redis not connected");
  return redis;
}

export async function connectRedis(): Promise<void> {
  redis = new Redis(env.redisUrl, { lazyConnect: true });

  await redis.connect();

  const pong = await Promise.race([
    redis.ping(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Redis ping timeout")), env.redisPingTimeoutMs),
    ),
  ]);

  if (pong !== "PONG") throw new Error("Redis ping failed");

  logger.info("Redis connected", { url: env.redisUrl });
}

export async function disconnectRedis(): Promise<void> {
  await redis?.quit();
  redis = null;
}
