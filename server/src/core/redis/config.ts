import Redis from "ioredis";
import { AppError } from "@/shared/errors";
import { REDIS_URL } from "@/shared/constants";
import logger from "@/core/logging";

let redis: Redis | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export const connectClient = (client: Redis, name: string) => {
    return new Promise((resolve, reject) => {
        client.on('connect', () => {
            logger.info(`[Redis] ✅ Connected (${name})`);
            resolve(true);
        });

        client.on('error', (err) => {
            if (name === 'sub-redis-client' && 
                err.message?.includes('subscriber mode')) {
                logger.debug(`[Redis] ℹ️ ${name} in subscriber mode (expected)`);
                return;
            }
            
            logger.error(`[Redis] ❌ ${name} error:`, err);
            if (!client.status || client.status === 'connecting') {
                reject(err);
            }
        });

        client.on('ready', () => {
            logger.debug(`[Redis] ${name} ready`);
        });
    });
};

export const setupRedis = async (url: string = REDIS_URL) => {
    try {
        // General client for normal operations
        redis = new Redis(url, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
        });

        // Pub client for publishing messages
        pubClient = new Redis(url, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
        });

        // Sub client - will be put into subscriber mode by Socket.IO adapter
        subClient = new Redis(url, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: false,
            lazyConnect: false,
        });

        await Promise.all([
            connectClient(redis, 'general-client'),
            connectClient(pubClient, 'pub-redis-client'),
            connectClient(subClient, 'sub-redis-client'),
        ]);

        logger.info("[Redis] 🚀 All clients connected");
    } catch (err) {
        logger.error("[Redis] ❌ Failed to setup:", err);
        throw err;
    }
};

export const getRedis = (): Redis => {
    if (!redis) {
        throw new AppError("Redis not connected, call setupRedis first", 503, "CONFLICT");
    }
    return redis;
};

export const getPubSubClients = (): { pub: Redis; sub: Redis } => {
    logger.debug("[Redis] getPubSubClients called");

    if (!pubClient || !subClient) {
        logger.error("[Redis] ❌ Pub/Sub clients not initialized");
        throw new AppError("Pub/Sub clients not initialized, call setupRedis first", 503, "CONFLICT");
    }

    logger.debug("[Redis] ✅ Returning initialized Pub/Sub clients");
    return { pub: pubClient, sub: subClient };
};

export const disconnectRedis = async () => {
    const clients = [
        { client: redis, name: 'general-client' },
        { client: pubClient, name: 'pub-client' },
        { client: subClient, name: 'sub-client' },
    ];

    for (const { client, name } of clients) {
        if (client) {
            try {
                await client.quit();
                logger.info(`[Redis] 👋 Disconnected ${name}`);
            } catch (err) {
                logger.error(`[Redis] Error disconnecting ${name}:`, err);
            }
        }
    }
};