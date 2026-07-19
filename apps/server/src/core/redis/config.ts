import Redis, { type RedisOptions } from "ioredis";
import { AppError } from "@/shared/errors";
import { REDIS_URL } from "@/shared/constants";
import config from "@/shared/config/config";
import logger from "@/core/logging";

let redis: Redis | null = null;
let pubClient: Redis | null = null;
let subClient: Redis | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function redisClientOptions(overrides: {
    enableReadyCheck?: boolean;
} = {}): RedisOptions {
    const commandTimeout = config.redisCommandTimeoutMs;
    const keepAlive = config.redisKeepAliveMs;
    return {
        maxRetriesPerRequest: 3,
        enableReadyCheck: overrides.enableReadyCheck ?? true,
        lazyConnect: false,
        connectTimeout: config.redisConnectTimeoutMs,
        // TCP keepalive: probes keep the VPC/NAT flow alive and surface a dead peer
        // fast, so a command never hangs on a silently-reaped idle socket. 0 = default off.
        ...(keepAlive > 0 ? { keepAlive } : {}),
        // 0 disables; only set when positive so local tools can opt out.
        ...(commandTimeout > 0 ? { commandTimeout } : {}),
    };
}

/**
 * PING every client on an interval so no request-path socket idles long enough to be
 * reaped by the VPC/firewall. A dead socket is reconnected proactively here instead of
 * being discovered by a user's request (which would hang until `commandTimeout`).
 * @see apps/matching-service/docs/redis-timeout-incident.md (Fix C)
 */
function startHeartbeat() {
    const intervalMs = config.redisHeartbeatMs;
    if (intervalMs <= 0 || heartbeatTimer) return;

    heartbeatTimer = setInterval(() => {
        // pub/sub client is put into subscriber mode and cannot run PING; the Socket.IO
        // adapter keeps it busy, so it never idles. Only ping the general + pub clients.
        for (const { client, name } of [
            { client: redis, name: 'general-client' },
            { client: pubClient, name: 'pub-redis-client' },
        ]) {
            if (!client || client.status !== 'ready') continue;
            client.ping().catch((err) => {
                logger.warn(`[Redis] heartbeat ping failed (${name})`, { err });
            });
        }
    }, intervalMs);

    // Don't keep the event loop alive just for the heartbeat.
    heartbeatTimer.unref?.();
    logger.info("[Redis] 💓 Heartbeat started", { intervalMs });
}

function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

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
        redis = new Redis(url, redisClientOptions());

        // Pub client for publishing messages
        pubClient = new Redis(url, redisClientOptions());

        // Sub client - will be put into subscriber mode by Socket.IO adapter
        subClient = new Redis(url, redisClientOptions({ enableReadyCheck: false }));

        await Promise.all([
            connectClient(redis, 'general-client'),
            connectClient(pubClient, 'pub-redis-client'),
            connectClient(subClient, 'sub-redis-client'),
        ]);

        startHeartbeat();

        logger.info("[Redis] 🚀 All clients connected", {
            commandTimeoutMs: config.redisCommandTimeoutMs,
            connectTimeoutMs: config.redisConnectTimeoutMs,
            keepAliveMs: config.redisKeepAliveMs,
            heartbeatMs: config.redisHeartbeatMs,
        });
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
    stopHeartbeat();

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