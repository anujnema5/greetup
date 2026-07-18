import Redis from "ioredis";
import { env } from "@/shared/config/env";
import { logger } from "@/core/logging";

export type RedisClient = Redis;

/**
 * Request-path pool.
 *
 * A single shared connection serializes every command over one socket, so one
 * slow or blocking command head-of-lines everything queued behind it — every
 * command still waiting its turn burns its `commandTimeout` and rejects with
 * `Command timed out`, even trivial GETs. That is exactly the burst of
 * [handleGetUserMatchState] failures we saw: the GET is the victim, not the
 * cause.
 *
 * Spreading request-path commands across a few independent sockets means a
 * single stall can only take out the commands on that one socket, not the whole
 * service. This is resilience, NOT a replacement for routing genuinely blocking
 * commands (BRPOP/BLPOP/WAIT) to the blocking client — do that too.
 */
const POOL_SIZE =
  env.redisPoolSize && env.redisPoolSize > 0 ? env.redisPoolSize : 4;

let pool: RedisClient[] = [];
let rrCursor = 0;

/** Dedicated connection for blocking commands (`BRPOP`, etc.). Never share a
 * request-path socket with blocking ops — one `BRPOP` would stall every other
 * command on that socket for the block timeout. */
let blockingClient: RedisClient | null = null;

/** Keeps request-path sockets warm so a VPC/NAT idle-reap can't kill them under
 * us. The blocking client is exempt — the worker's `BRPOP` every couple seconds
 * keeps it continuously busy, so it never idles long enough to be reaped. */
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

const stopHeartbeat = (): void => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const startHeartbeat = (): void => {
  stopHeartbeat();
  if (env.redisHeartbeatMs <= 0) return;
  heartbeatTimer = setInterval(() => {
    for (const client of pool) {
      if (!isLive(client)) continue;
      // A stale socket's PING rejects (or its reconnect kicks in); either way we
      // surface/repair the dead connection here rather than on a user's request.
      client.ping().catch((error) => {
        logger.warn("Redis heartbeat ping failed", { error: String(error) });
      });
    }
  }, env.redisHeartbeatMs);
  // Don't let the heartbeat keep the event loop alive on shutdown.
  heartbeatTimer.unref?.();
};

const isLive = (c: RedisClient | null | undefined): c is RedisClient =>
  !!c && c.status !== "end";

const makeClient = (commandTimeout?: number): RedisClient =>
  new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
    connectTimeout: env.redisConnectTimeoutMs,
    // Remote Redis over a VPC/NAT path silently drops idle TCP flows. TCP
    // keepalive probes keep the flow alive and let the OS surface a dead peer
    // fast, instead of a command discovering it by hanging until commandTimeout.
    ...(env.redisKeepAliveMs > 0 ? { keepAlive: env.redisKeepAliveMs } : {}),
    noDelay: true,
    ...(commandTimeout != null ? { commandTimeout } : {}),
  });

export const connectRedis = async (): Promise<RedisClient> => {
  const existing = pool[0];
  if (existing && pool.every(isLive)) {
    return existing;
  }

  const commandTimeout =
    env.redisCommandTimeoutMs > 0 ? env.redisCommandTimeoutMs : undefined;

  const size = POOL_SIZE > 0 ? POOL_SIZE : 1;
  const clients = Array.from({ length: size }, (_unused, i) => {
    const c = makeClient(commandTimeout);
    c.on("error", (error) => {
      logger.error("Redis client error", { poolIndex: i, error: String(error) });
    });
    return c;
  });
  const [primary] = clients;
  if (!primary) {
    throw new Error("Redis pool initialization produced no clients");
  }

  await Promise.all(
    clients.map(async (c) => {
      await c.connect();
      await c.ping();
    }),
  );

  pool = clients;
  rrCursor = 0;

  // Blocking client must NOT set commandTimeout — BRPOP sleeps up to
  // blockSeconds and would otherwise be killed mid-wait.
  const blocking = makeClient(undefined);
  blocking.on("error", (error) => {
    logger.error("Redis blocking client error", { error: String(error) });
  });
  await blocking.connect();
  await blocking.ping();
  blockingClient = blocking;

  startHeartbeat();

  logger.info("Redis connected", {
    url: env.redisUrl,
    poolSize: size,
    commandTimeoutMs: env.redisCommandTimeoutMs,
    connectTimeoutMs: env.redisConnectTimeoutMs,
    keepAliveMs: env.redisKeepAliveMs,
    heartbeatMs: env.redisHeartbeatMs,
  });

  return primary;
};

/**
 * Returns the next live request-path client (round-robin).
 *
 * Note on transactions/pipelines: call this ONCE and chain on the returned
 * client (`const r = getRedis(); await r.multi()...`). Don't call getRedis()
 * per-command inside a transaction — each call may hand back a different socket.
 */
export const getRedis = (): RedisClient => {
  const live = pool.filter(isLive); 
  if (live.length === 0) {
    throw new Error("Redis client not initialized");
  }
  rrCursor = (rrCursor + 1) % live.length;
  const client = live[rrCursor];
  if (!client) {
    throw new Error("Redis client not initialized");
  }
  return client;
};

/** Use only for blocking Redis commands; keeps request-path Redis fast while the
 * worker waits on the queue. */
export const getRedisBlocking = (): RedisClient => {
  if (!isLive(blockingClient)) {
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
  stopHeartbeat();
  const toClose = pool.filter(isLive);
  pool = [];
  rrCursor = 0;
  await Promise.all(
    toClose.map((c) => c.quit().catch((e) => logger.error("Redis quit failed", { error: String(e) }))),
  );

  if (isLive(blockingClient)) {
    await blockingClient
      .quit()
      .catch((e) => logger.error("Redis blocking quit failed", { error: String(e) }));
    blockingClient = null;
  }

  logger.info("Redis disconnected");
};
