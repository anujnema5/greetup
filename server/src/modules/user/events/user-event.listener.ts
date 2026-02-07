import eventEmitter from "../../../core/events";
import { EventPayloads } from "../../../core/events/types/events.types";
import Redis from "ioredis";
import { getRedis } from "@/core/redis";
import logger from "@/core/logging";

export class UserEventListeners {
    private jobName = "UserEventListeners"
    private redis: Redis;

    constructor() {
        this.redis = getRedis();
        this.init();
    }

    private init() {
        eventEmitter.on('user:connected', (payload) => this.userConnected(payload));
        eventEmitter.on('user:disconnected', (payload) => this.userDisconnected(payload))
    }

    private async userConnected(payload: EventPayloads['user:connected']) {
        logger.info(`[${this.jobName}] User connected`);
        const { socketId, userId, timestamp } = payload;
        if (!userId || !socketId) {
            logger.error(`[${this.jobName}] userId not in payload, cannot set user online.`);
            return;
        }

        // Add socket to user's set
        await this.redis.sadd(`online_users:${userId}`, socketId);

        // Extend TTL on each connection (user stays online longer)
        await this.redis.expire(`online_users:${userId}`, 60 * 60);

        // Track global unique online users
        await this.redis.sadd('all_online_users', userId);

        logger.info(`[${this.jobName}] Added socket ${socketId} for user ${userId}`);
    }

    private async userDisconnected(payload: EventPayloads['user:disconnected']) {
        const { socketId, userId } = payload;

        // Remove specific socket
        await this.redis.srem(`online_users:${userId}`, socketId);

        const socketsLeft = await this.redis.scard(`online_users:${userId}`);

        if (socketsLeft === 0) {
            // User completely offline - cleanup everything
            await this.redis.del(`online_users:${userId}`);
            await this.redis.srem('all_online_users', userId);
            logger.info(`[${this.jobName}] User ${userId} is now completely offline`);
        } else {
            logger.info(`[${this.jobName}] User ${userId} still has ${socketsLeft} connections`);
        }
    }
}