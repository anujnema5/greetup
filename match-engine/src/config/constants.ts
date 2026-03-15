import { env } from "@/config/env";

export const APP_CONFIG = {
  serviceName: "matching-service",
  host: env.host,
  port: env.port,
} as const;

export const MATCH_CONFIG = {
  searchTimeoutMs: 25_000,
  lockTtlMs: 20_000,
  roomCreateTimeoutMs: 7_000,
  maxRetries: 3,
  retryBackoffMs: [500, 1_500, 3_500],
  candidateBatchSize: 25,
  attemptTtlSeconds: 120,
} as const;
