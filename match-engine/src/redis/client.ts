import Redis from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/core/logger";

export type RedisClient = Redis;

let client: RedisClient | null = null;

export const connectRedis = async (): Promise<RedisClient> => {
  if (client && client.status !== "end") {
    return client;
  }

  const redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: 10_000,
  });

  redis.on("error", (error) => {
    logger.error("Redis client error", { error: String(error) });
  });

  await redis.connect();
  await redis.ping();

  client = redis;
  logger.info("Redis connected", { url: env.redisUrl });
  return client;
};

export const getRedis = (): RedisClient => {
  if (!client || client.status === "end") {
    throw new Error("Redis client not initialized");
  }
  return client;
};

export const pingRedis = async (): Promise<boolean> => {
  try {
    const redis = getRedis();
    return (await redis.ping()) === "PONG";
  } catch {
    return false;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (!client || client.status === "end") {
    return;
  }
  await client.quit();
  client = null;
  logger.info("Redis disconnected");
};
