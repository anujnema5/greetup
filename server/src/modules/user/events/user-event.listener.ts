import eventEmitter from "@/core/events";
import { EventPayloads } from "@/core/events/types/events.types";
import Redis from "ioredis";
import { getRedis } from "@/core/redis";
import logger from "@/core/logging";
import { USER_PRESENCE_KEYS } from "@/core/redis/keys";
import { ensureProfileSnapshotCached } from "@/modules/user/services/profile-snapshot-cache.service";
import { getUserMatchStateService, cancelMatchService } from "@/modules/matching/services/matchmaking.service";
import { emitToUser, getSocket } from "@/core/socket/socket";

export class UserEventListeners {
    private jobName = "UserEventListeners"
    private redis: Redis;

    // 1 MINUTES TTL — IF SERVER CRASHES AND DISCONNECT EVENT NEVER FIRES, REDIS WILL AUTO-CLEAN STALE PRESENCE DATA
    private static readonly PRESENCE_TTL_SECONDS = 60 * 1;
    // Grace period before removing a disconnected user from the matching pool
    private static readonly MATCH_GRACE_MS = 12_000;

    // In-memory map of grace period timers: userId → timer handle
    // Acceptable because the grace window is only 12s — a server restart within that window
    // is an acceptable edge case (user stays in pool slightly longer, matching engine handles it).
    private gracePeriodTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

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
        // EXPIRE: RESET THE 1 MINUTES TTL ON EVERY NEW CONNECTION
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

        await ensureProfileSnapshotCached(userId);

        // Cancel any pending grace-period removal — user reconnected in time
        this.cancelGracePeriod(userId);

        // Push current match state back to this socket so the client can restore UI
        // without any extra API call (handles page refresh + device switch)
        await this.emitMatchStateOnConnect(userId);

        logger.info(`[${this.jobName}] Marked user ${userId} online with socket ${socketId} for ip ${ipField}`);
    }

    private async emitMatchStateOnConnect(userId: string): Promise<void> {
        try {
            logger.info(`[${this.jobName}] checking match state on connect`, { userId });
            const state = await getUserMatchStateService(userId);
            logger.info(`[${this.jobName}] match state fetched`, { userId, status: state.status, requestId: state.requestId, roomId: state.roomId });

            if (state.status === "searching" && state.requestId) {
                emitToUser(userId, "match:state", { status: "searching", requestId: state.requestId });
                logger.info(`[${this.jobName}] emitted match:state searching`, { userId, requestId: state.requestId });
            } else if (state.status === "matched" && state.roomId) {
                emitToUser(userId, "match:state", { status: "matched", roomId: state.roomId, requestId: state.requestId });
                logger.info(`[${this.jobName}] emitted match:state matched`, { userId, roomId: state.roomId });
            } else {
                logger.info(`[${this.jobName}] no active match state to restore`, { userId, status: state.status });
            }
        } catch (err) {
            logger.warn(`[${this.jobName}] Failed to emit match state on connect for user ${userId}`, { err });
        }
    }

    // FIRED ON EVERY PING/PONG CYCLE (EVERY 20 SECONDS).
    // RESETS THE TTL BACK TO 1 MINUTES SO THE PRESENCE KEY NEVER EXPIRES
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
        // DO NOT REMOVE FROM THE ONLINE SET OR START GRACE PERIOD.
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

        // Start grace period — if user was searching, give them 12s to reconnect before
        // removing them from the matching pool. Handles page refresh + brief network drops.
        await this.startGracePeriodIfSearching(userId);
    }

    private async startGracePeriodIfSearching(userId: string): Promise<void> {
        try {
            const state = await getUserMatchStateService(userId);
            if (state.status !== "searching") return;

            logger.info(`[${this.jobName}] Starting ${UserEventListeners.MATCH_GRACE_MS}ms grace period for searching user ${userId}`);

            const timer = setTimeout(async () => {
                this.gracePeriodTimers.delete(userId);
                try {
                    // Check again — user might have reconnected and been re-added to pool
                    const io = getSocket();
                    const room = io.sockets.adapter.rooms.get(`user:${userId}`);
                    if (room && room.size > 0) {
                        logger.info(`[${this.jobName}] Grace period expired but user ${userId} reconnected — skipping pool removal`);
                        return;
                    }
                    await cancelMatchService(userId);
                    logger.info(`[${this.jobName}] Grace period expired — removed user ${userId} from matching pool`);
                } catch (err) {
                    logger.warn(`[${this.jobName}] Failed to cancel match after grace period for user ${userId}`, { err });
                }
            }, UserEventListeners.MATCH_GRACE_MS);

            this.gracePeriodTimers.set(userId, timer);
        } catch (err) {
            logger.warn(`[${this.jobName}] startGracePeriodIfSearching failed for user ${userId}`, { err });
        }
    }

    private cancelGracePeriod(userId: string): void {
        const timer = this.gracePeriodTimers.get(userId);
        if (timer) {
            clearTimeout(timer);
            this.gracePeriodTimers.delete(userId);
            logger.info(`[${this.jobName}] Cancelled grace period for user ${userId} — reconnected in time`);
        }
    }
}
