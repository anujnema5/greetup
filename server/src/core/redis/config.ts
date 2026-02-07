import Redis from "ioredis";
import { AppError } from "@/shared/errors";
import { REDIS_URL } from "@/shared/constants";
import logger from "@/core/logging";

let redis: Redis | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

/**
 * Connect Redis client
 */
export const connectClient = (client: Redis, name: string) => {
    return new Promise((resolve, reject) => {
        client.on('connect', () => {
            logger.info(`[Redis] ✅ Connected (${name})`);
            resolve(true);
        })

        client.on('error', (err) => {
            logger.error(`[Redis] ❌ ${name} error:`, err);
            reject(false);
        })
    })
}

/**
 * Setup Redis clients
 */
export const setupRedis = async (url: string = REDIS_URL) => {
    try {
        redis = new Redis(url);
        pubClient = new Redis(url);
        subClient = pubClient.duplicate();

        await Promise.all([
            connectClient(redis, 'general-client'),
            connectClient(pubClient, 'pub-redis-client'),
            connectClient(subClient, 'sub-redis-client'),
        ])

        logger.info("[Redis] 🚀 All clients connected");
    } catch (err) {
        logger.error("[Redis] ❌ Failed to setup:", err);
        throw err;
    }
};

/**
 * Get general Redis instance
 */
export const getRedis = (): Redis => {
    if (!redis) {
        throw new AppError("Redis not connected, call setupRedis first", 503, "CONFLICT");
    }
    return redis;
};

/**
 * Get pub/sub clients (for adapters like Socket.IO)
 */
export const getPubSubClients = (): { pub: Redis; sub: Redis } => {
    logger.info("[Redis] getPubSubClients called");

    if (!pubClient || !subClient) {
        console.error("[Redis] ❌ Pub/Sub clients not initialized. Did you forget to call setupRedis?");
        throw new AppError("Pub/Sub clients not initialized, call setupRedis first", 503, "CONFLICT");
    }

    logger.info("[Redis] ✅ Returning initialized Pub/Sub clients");
    return { pub: pubClient, sub: subClient };
};