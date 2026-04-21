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

const config = {
  env: nodeEnv,
  port: parsePort(process.env.PORT, 5300),
  listenHost: optionalEnv("LISTEN_HOST") ?? (nodeEnv === "production" ? "0.0.0.0" : "localhost"),
  debug: optionalEnv("APP_DEBUG") === "true",
  databaseUrl: requiredEnv("DATABASE_URL"),
  betterAuthUrl: requiredUrlEnv("BETTER_AUTH_URL"),
  betterAuthSecret: requiredEnv("BETTER_AUTH_SECRET"),
  webClientHost: requiredUrlEnv("WEB_CLIENT_HOST"),
  resendApiKey: requiredEnv("RESEND_API_KEY"),
  googleClientId: requiredEnv("GOOGLE_CLIENT_ID"),
  googleClientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
  redisUrl: requiredEnv("REDIS_URL"),
  serverUrl: requiredUrlEnv("SERVER_URL"),
  authCookieDomain: optionalEnv("AUTH_COOKIE_DOMAIN")?.replace(/^\./, ""),
  devNotificationEmail: requiredEnv("DEV_NOTIFICATION_EMAIL"),
  internalApiKey: requiredEnv("INTERNAL_API_KEY"),
  /** Base URL for rtc-service (mediasoup) — used to sync `roomType` on sockets after 1:1 → circle. */
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

  /** AES-256-GCM message encryption key (32 bytes / 64 hex chars). Loaded from Doppler. */
  messageEncryptionKey: optionalEnv("MESSAGE_ENCRYPTION_KEY"),
  messageEncryptionKeyPrevious: optionalEnv("MESSAGE_ENCRYPTION_KEY_PREVIOUS"),
};

export default config;