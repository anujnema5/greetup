import Redis from "ioredis";
import { env } from "@/config/env";
import { logger } from "@/shared/logger";

export type RedisClient = Redis;

let client: RedisClient | null = null;
/** Dedicated connection for blocking commands (`BRPOP`, etc.). Never share the main connection with blocking ops — one `BRPOP` would stall every other command on that socket for the block timeout (~2s). */
let blockingClient: RedisClient | null = null;

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

  const blocking = redis.duplicate();
  blocking.on("error", (error) => {
    logger.error("Redis blocking client error", { error: String(error) });
  });
  await blocking.connect();
  await blocking.ping();
  blockingClient = blocking;

  logger.info("Redis connected", { url: env.redisUrl });
  return client;
};

export const getRedis = (): RedisClient => {
  if (!client || client.status === "end") {
    throw new Error("Redis client not initialized");
  }
  return client;
};

/** Use only for blocking Redis commands; keeps request-path Redis fast while the worker waits on the queue. */
export const getRedisBlocking = (): RedisClient => {
  if (!blockingClient || blockingClient.status === "end") {
    throw new Error("Redis blocking client not initialized");
  }
  return blockingClient;
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
  if (blockingClient && blockingClient.status !== "end") {
    await blockingClient.quit();
    blockingClient = null;
  }
  if (!client || client.status === "end") {
    return;
  }
  await client.quit();
  client = null;
  logger.info("Redis disconnected");
};
