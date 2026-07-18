import "@/shared/config/load-env";

const getNumberEnv = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeHost = (value: string | undefined, fallback: string): string => {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  if (trimmed.includes("://")) {
    try {
      return new URL(trimmed).hostname || fallback;
    } catch {
      return fallback;
    }
  }

  return trimmed;
};
export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: normalizeHost(process.env.MATCHING_HOST, "0.0.0.0"),
  port: getNumberEnv(process.env.PORT ?? process.env.MATCHING_PORT, 5060),
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:26379",
  redisPingTimeoutMs: getNumberEnv(process.env.REDIS_PING_TIMEOUT_MS, 800),
  /** Per-command deadline on the request-path Redis client (not the BRPOP worker).
   * Default 5s — App Platform → droplet Redis over VPC can be slower than localhost. */
  redisCommandTimeoutMs: getNumberEnv(process.env.REDIS_COMMAND_TIMEOUT_MS, 5_000),
  redisConnectTimeoutMs: getNumberEnv(process.env.REDIS_CONNECT_TIMEOUT_MS, 10_000),
  /** Number of independent request-path Redis sockets. A stall on one socket
   * can only head-of-line block commands routed to that socket, not all of them. */
  redisPoolSize: getNumberEnv(process.env.REDIS_POOL_SIZE, 4),
  /** TCP keepalive probe interval (ms). Remote Redis over a VPC/NAT path silently
   * drops idle TCP flows; without keepalive probes ioredis only discovers a dead
   * socket when it sends the next command, which then hangs until `commandTimeout`.
   * 0 disables (ioredis default) — do NOT leave it disabled for remote Redis. */
  redisKeepAliveMs: getNumberEnv(process.env.REDIS_KEEPALIVE_MS, 30_000),
  /** Application-level heartbeat (ms): PING every idle request-path socket so it
   * is never idle long enough to be reaped, and so a dead one is reconnected
   * proactively instead of on a user's request. 0 disables. */
  redisHeartbeatMs: getNumberEnv(process.env.REDIS_HEARTBEAT_MS, 25_000),
  roomServiceUrl: process.env.ROOM_SERVICE_URL,
  roomServiceMode: process.env.MATCHING_ROOM_MODE ?? "mock",
  matchWebhookUrl: process.env.MATCH_WEBHOOK_URL,
  internalApiKey: process.env.INTERNAL_API_KEY ?? "",
  stressBaseUrl: process.env.STRESS_BASE_URL ?? "http://localhost:8000",
  stressTestDurationSeconds: getNumberEnv(process.env.STRESS_TEST_DURATION_SECONDS, 60),
  /**
   * `guest_and_registered` (launch): guests match anyone searching.
   * `guest_only`: guests match guests only; registered never see guests.
   */
  guestMatchPool: (process.env.GUEST_MATCH_POOL?.trim() === "guest_only"
    ? "guest_only"
    : "guest_and_registered") as "guest_only" | "guest_and_registered",
};
