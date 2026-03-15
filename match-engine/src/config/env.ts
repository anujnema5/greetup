import "@/config/load-env";

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
  port: getNumberEnv(process.env.MATCHING_PORT, 5060),
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:16379",
  redisPingTimeoutMs: getNumberEnv(process.env.REDIS_PING_TIMEOUT_MS, 800),
  roomServiceUrl: process.env.ROOM_SERVICE_URL,
  roomServiceMode: process.env.MATCHING_ROOM_MODE ?? "mock",
};
