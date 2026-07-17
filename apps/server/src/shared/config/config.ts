const nodeEnv = process.env.NODE_ENV || "development";

function sanitizeEnvValue(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value || value.toLowerCase() === "undefined" || value.toLowerCase() === "null") {
    return undefined;
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  return sanitizeEnvValue(process.env[name]);
}

function requiredEnv(name: string): string {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function requiredUrlEnv(name: string): string {
  const value = requiredEnv(name);
  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) {
      throw new Error("Invalid URL protocol");
    }
    return normalizeUrl(value);
  } catch {
    throw new Error(`[config] Invalid URL in environment variable ${name}: ${value}`);
  }
}

function optionalUrlEnv(name: string): string | undefined {
  const value = optionalEnv(name);
  if (!value) {
    return undefined;
  }
  try {
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) {
      return undefined;
    }
    return normalizeUrl(value);
  } catch {
    return undefined;
  }
}

function parsePort(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const config = {
  env: nodeEnv,
  port: parsePort(process.env.PORT, 5300),
  // Dev: bind IPv4 loopback explicitly. On Windows "localhost" resolves to ::1 (IPv6),
  // but the client proxy connects to 127.0.0.1 (IPv4) → ECONNREFUSED. Keep both on IPv4.
  listenHost: optionalEnv("LISTEN_HOST") ?? (nodeEnv === "production" ? "0.0.0.0" : "127.0.0.1"),
  debug: optionalEnv("APP_DEBUG") === "true",
  databaseUrl: requiredEnv("DATABASE_URL"),
  betterAuthUrl: requiredUrlEnv("BETTER_AUTH_URL"),
  betterAuthSecret: requiredEnv("BETTER_AUTH_SECRET"),
  webClientHost: requiredUrlEnv("WEB_CLIENT_HOST"),
  mailjetApiKey: requiredEnv("MAILJET_API_KEY"),
  mailjetApiSecret: requiredEnv("MAILJET_API_SECRET"),
  mailFromEmail: requiredEnv("MAIL_FROM_EMAIL"),
  mailFromName: optionalEnv("MAIL_FROM_NAME") ?? "Greetup",
  googleClientId: requiredEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
  googleMapsApiKey: optionalEnv("GOOGLE_MAPS_API_KEY"),
  redisUrl: requiredEnv("REDIS_URL"),
  /**
   * Per-command Redis deadline (ioredis `commandTimeout`). Keeps Redis outages from
   * hanging HTTP handlers until Cloudflare returns 504. Default 3s.
   */
  redisCommandTimeoutMs: parseNonNegativeInt(optionalEnv("REDIS_COMMAND_TIMEOUT_MS"), 3_000),
  /** TCP connect deadline for Redis clients. Default 10s. */
  redisConnectTimeoutMs: parseNonNegativeInt(optionalEnv("REDIS_CONNECT_TIMEOUT_MS"), 10_000),
  /** Abort match-engine HTTP calls that stall (e.g. matching Redis hang). Default 8s. */
  matchEngineTimeoutMs: parseNonNegativeInt(optionalEnv("MATCH_ENGINE_TIMEOUT_MS"), 8_000),
  serverUrl: requiredUrlEnv("SERVER_URL"),
  authCookieDomain: optionalEnv("AUTH_COOKIE_DOMAIN")?.replace(/^\./, ""),
  devNotificationEmail: requiredEnv("DEV_NOTIFICATION_EMAIL"),
  internalApiKey: requiredEnv("INTERNAL_API_KEY"),
  /** Base URL for rtc-service (mediasoup) — used to sync `roomType` on sockets after 1:1 → space. */
  rtcServiceBaseUrl: normalizeUrl(optionalEnv("RTC_SERVICE_URL") ?? "http://localhost:5370"),
  rtcJwtSecret: requiredEnv("RTC_JWT_SECRET"),
  matchEngineUrl: optionalEnv("MATCH_ENGINE_URL") ?? "http://localhost:5060",
  logLevel: optionalEnv("LOG_LEVEL"),

  /** DigitalOcean Spaces (S3-compatible). All required for profile photo presigned uploads. */
  doSpacesKey: optionalEnv("DO_SPACES_KEY"),
  doSpacesSecret: optionalEnv("DO_SPACES_SECRET"),
  doSpacesBucket: optionalEnv("DO_SPACES_BUCKET"),
  doSpacesRegion: optionalEnv("DO_SPACES_REGION"),
  doSpacesEndpoint: optionalEnv("DO_SPACES_ENDPOINT"),
  /** Object key prefix, e.g. `profile-images` (no leading/trailing slashes). */
  doSpacesKeyPrefix: optionalEnv("DO_SPACES_KEY_PREFIX") ?? "profile-images",
  /**
   * Optional public base URL for objects (CDN or custom domain).
   * If unset, `https://{bucket}.{region}.digitaloceanspaces.com` is used.
   */
  doSpacesPublicBaseUrl: optionalUrlEnv("DO_SPACES_PUBLIC_BASE_URL"),

  geminiApiKey: requiredEnv("GEMINI_API_KEY"),

  /**
   * AWS SNS — phone OTP SMS delivery (replaces Firebase Phone Auth). SNS only transports the
   * SMS; the OTP is generated/verified server-side (see `core/auth/otp`). Requires an IAM
   * principal with `sns:Publish`. Optional at boot so non-phone flows still run without it;
   * `sendOtpSms` throws a clear error if unset when a code is actually requested.
   */
  awsSnsRegion: optionalEnv("AWS_SNS_REGION"),
  awsAccessKeyId: optionalEnv("AWS_ACCESS_KEY_ID"),
  awsSecretAccessKey: optionalEnv("AWS_SECRET_ACCESS_KEY"),
  /** Alphanumeric sender shown on the SMS where the destination country supports it (not US/CA). */
  awsSnsSenderId: optionalEnv("AWS_SNS_SENDER_ID"),

  /** Phone OTP tunables (server-side generate/verify). */
  otpTtlSec: parseNonNegativeInt(optionalEnv("OTP_TTL_SEC"), 300),
  otpLength: parseNonNegativeInt(optionalEnv("OTP_LENGTH"), 6),
  otpMaxAttempts: parseNonNegativeInt(optionalEnv("OTP_MAX_ATTEMPTS"), 5),

  /** AES-256-GCM message encryption key (32 bytes / 64 hex chars). Loaded from Doppler. */
  messageEncryptionKey: optionalEnv("MESSAGE_ENCRYPTION_KEY"),
  messageEncryptionKeyPrevious: optionalEnv("MESSAGE_ENCRYPTION_KEY_PREVIOUS"),

  /**
   * Background sweep for past-due live/scheduled rooms (full reconcile + teardown).
   * `0` disables the interval. Default 60_000 ms.
   */
  roomSessionSweepIntervalMs: parseNonNegativeInt(
    optionalEnv("ROOM_SESSION_SWEEP_INTERVAL_MS"),
    60_000,
  ),
};

export default config;