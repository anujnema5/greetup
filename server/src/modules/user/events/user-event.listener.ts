import eventEmitter from "@/core/events";
import { EventPayloads } from "@/core/events/types/events.types";
import Redis from "ioredis";
import { getRedis } from "@/core/redis";
import logger from "@/core/logging";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";

export class UserEventListeners {
    private jobName = "UserEventListeners"
    private redis: Redis;

    // 3 MINUTES TTL — IF SERVER CRASHES AND DISCONNECT EVENT NEVER FIRES, REDIS WILL AUTO-CLEAN STALE PRESENCE DATA
    private static readonly PRESENCE_TTL_SECONDS = 60 * 3;

    // LUA SCRIPT THAT RUNS ATOMICALLY IN REDIS — CHECKS IF THE STORED SOCKET ID MATCHES THE DISCONNECTING SOCKET
    // BEFORE DELETING. PREVENTS A RACE CONDITION WHERE A NEW CONNECTION FROM THE SAME IP GETS WRONGLY EVICTED
    // WHEN AN OLD CONNECTION CLOSES. RETURNS 1 IF DELETED, 0 IF SKIPPED.
    private static readonly REMOVE_IP_IF_SOCKET_MATCHES = `
        local current = redis.call("HGET", KEYS[1], ARGV[1])
        if current and current == ARGV[2] then
            redis.call("HDEL", KEYS[1], ARGV[1])
            return 1
        end
        return 0
    `;

    // SANITIZES RAW IP VALUES THAT MAY COME IN AS "undefined", "null", OR EMPTY FROM PROXIES/MISSING HEADERS.
    // FALLS BACK TO "unknown:{socketId}" SO EACH UNKNOWN IP STILL GETS A UNIQUE FIELD IN THE HASH INSTEAD OF COLLIDING
    private normalizeIpField(ip: string | undefined, socketId: string): string {
        const value = (ip ?? "").trim().toLowerCase();
        if (!value || value === "undefined" || value === "null" || value === "unknown") {
            return `unknown:${socketId}`;
        }
        return value;
    }

    constructor() {
        // INITIALIZE REDIS CONNECTION AND REGISTER EVENT LISTENERS ON STARTUP
        this.redis = getRedis();
        this.init();
    }

    private init() {
        // BIND SOCKET LIFECYCLE EVENTS TO PRESENCE HANDLERS
        eventEmitter.on('user:connected', (payload) => this.userConnected(payload));
        eventEmitter.on('user:disconnected', (payload) => this.userDisconnected(payload));

        // REFRESH TTL ON EVERY PING/PONG HEARTBEAT SO ACTIVE USERS NEVER GET
        // THEIR PRESENCE KEY EXPIRED WHILE THEY ARE STILL ON THE PAGE
        eventEmitter.on('user:heartbeat', (payload) => this.userHeartbeat(payload));
    }

    private async userConnected(payload: EventPayloads['user:connected']) {
        logger.info(`[${this.jobName}] User connected`);
        const { socketId, userId, ip, timestamp } = payload;

        // GUARD: IF CRITICAL IDENTIFIERS ARE MISSING, WE CANNOT TRACK PRESENCE — ABORT EARLY
        if (!userId || !socketId) {
            logger.error(`[${this.jobName}] userId not in payload, cannot set user online.`);
            return;
        }

        const userPresenceKey = `${USER_PRESENCE_KEYS.ONLINE_USER_IPS}${userId}`;
        const lastSeenTimestamp = timestamp.getTime();
        const ipField = this.normalizeIpField(ip, socketId);

        // ATOMIC TRANSACTION — ALL 5 COMMANDS EXECUTE TOGETHER OR NOT AT ALL.
        // HDEL:   CLEAN UP LEGACY GARBAGE FIELDS THAT MAY HAVE BEEN STORED FROM OLDER VERSIONS
        // HSET:   REGISTER THIS IP → SOCKET MAPPING (OVERWRITES IF SAME IP RECONNECTS — HANDLES PAGE REFRESH)
        // EXPIRE: RESET THE 3 MINUTES TTL ON EVERY NEW CONNECTION
        // SADD:   MARK THIS USER AS ONLINE IN THE GLOBAL ONLINE USERS SET
        // SET:    RECORD THE EXACT TIMESTAMP OF THIS CONNECTION AS LAST SEEN
        await this.redis
            .multi()
            .hdel(userPresenceKey, "undefined", "null", "")
            .hset(userPresenceKey, ipField, socketId)
            .expire(userPresenceKey, UserEventListeners.PRESENCE_TTL_SECONDS)
            .sadd(USER_PRESENCE_KEYS.ONLINE_USERS_SET, userId)
            .set(`${USER_PRESENCE_KEYS.USER_LAST_SEEN}${userId}`, String(lastSeenTimestamp))
            .exec();

        logger.info(`[${this.jobName}] Marked user ${userId} online with socket ${socketId} for ip ${ipField}`);
    }

    // FIRED ON EVERY PING/PONG CYCLE (EVERY 20 SECONDS).
    // RESETS THE TTL BACK TO 3 MINUTES SO THE PRESENCE KEY NEVER EXPIRES
    // WHILE THE USER IS ACTIVELY CONNECTED ON THE PAGE.
    private async userHeartbeat(payload: EventPayloads['user:heartbeat']) {
        const { userId } = payload;

        if (!userId) return;

        const userPresenceKey = `${USER_PRESENCE_KEYS.ONLINE_USER_IPS}${userId}`;

        // ONLY REFRESH TTL IF THE KEY ACTUALLY EXISTS — NO POINT EXTENDING A KEY
        // THAT WAS ALREADY DELETED BY A DISCONNECT EVENT
        const exists = await this.redis.exists(userPresenceKey);
        if (!exists) return;

        await this.redis.expire(userPresenceKey, UserEventListeners.PRESENCE_TTL_SECONDS);
        logger.info(`[${this.jobName}] Refreshed TTL for user ${userId} via heartbeat`);
    }

    private async userDisconnected(payload: EventPayloads['user:disconnected']) {
        const { socketId, userId, ip, timestamp } = payload;
        const userPresenceKey = `${USER_PRESENCE_KEYS.ONLINE_USER_IPS}${userId}`;
        const lastSeenTimestamp = timestamp.getTime();
        const ipField = this.normalizeIpField(ip, socketId);

        // RUN THE LUA SCRIPT ATOMICALLY — ONLY REMOVES THE IP ENTRY IF THE STORED SOCKET ID
        // STILL MATCHES THIS DISCONNECTING SOCKET. SAFE AGAINST RACE CONDITIONS FROM RAPID RECONNECTS.
        const removed = await this.redis.eval(
            UserEventListeners.REMOVE_IP_IF_SOCKET_MATCHES,
            1,
            userPresenceKey,
            ipField,
            socketId,
        );

        // CHECK HOW MANY IP ENTRIES REMAIN — USER MAY STILL BE CONNECTED FROM ANOTHER TAB OR DEVICE
        const ipsLeft = await this.redis.hlen(userPresenceKey);

        // USER IS STILL ONLINE VIA ANOTHER IP/DEVICE — JUST REFRESH THE TTL AND EXIT EARLY.
        // DO NOT REMOVE FROM THE ONLINE SET.
        if (ipsLeft > 0) {
            await this.redis.expire(userPresenceKey, UserEventListeners.PRESENCE_TTL_SECONDS);
            logger.info(`[${this.jobName}] User ${userId} still online via ${ipsLeft} ip(s). Removed current ip mapping: ${removed === 1}`);
            return;
        }

        // NO IPS LEFT — USER IS FULLY OFFLINE ACROSS ALL DEVICES AND TABS.
        // ATOMIC TRANSACTION:
        // DEL:  REMOVE THE NOW-EMPTY PRESENCE HASH
        // SREM: REMOVE USER FROM THE GLOBAL ONLINE USERS SET
        // SET:  RECORD THE EXACT TIMESTAMP OF THIS DISCONNECT AS LAST SEEN
        await this.redis
            .multi()
            .del(userPresenceKey)
            .srem(USER_PRESENCE_KEYS.ONLINE_USERS_SET, userId)
            .set(`${USER_PRESENCE_KEYS.USER_LAST_SEEN}${userId}`, String(lastSeenTimestamp))
            .exec();

        logger.info(`[${this.jobName}] User ${userId} is now offline (ip: ${ipField}, socket: ${socketId})`);
    }
}