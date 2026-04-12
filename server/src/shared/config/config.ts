const nodeEnv = process.env.NODE_ENV || "development";

const config = {
    env: nodeEnv,
    port: parseInt(process.env.PORT || "5050"),
    listenHost:
        process.env.LISTEN_HOST ??
        (nodeEnv === "production" ? "0.0.0.0" : "localhost"),
    debug: process.env.APP_DEBUG === "true",
    databaseUrl: process.env.DATABASE_URL!,
    betterAuthUrl: process.env.BETTER_AUTH_URL!,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET!,
    webClientHost: process.env.WEB_CLIENT_HOST!,
    resendApiKey: process.env.RESEND_API_KEY!,
    googleClientId: process.env.GOOGLE_CLIENT_ID!,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redisUrl: process.env.REDIS_URL!,
    serverUrl: process.env.SERVER_URL!,
    devNotificationEmail: process.env.DEV_NOTIFICATION_EMAIL!,
    internalApiKey: process.env.INTERNAL_API_KEY!,
    rtcJwtSecret: process.env.RTC_JWT_SECRET!,
    matchEngineUrl: process.env.MATCH_ENGINE_URL ?? "http://localhost:5060",
    logLevel: process.env.LOG_LEVEL,

    /** DigitalOcean Spaces (S3-compatible). All required for profile photo presigned uploads. */
    doSpacesKey: process.env.DO_SPACES_KEY,
    doSpacesSecret: process.env.DO_SPACES_SECRET,
    doSpacesBucket: process.env.DO_SPACES_BUCKET,
    doSpacesRegion: process.env.DO_SPACES_REGION,
    doSpacesEndpoint: process.env.DO_SPACES_ENDPOINT,
    /** Object key prefix, e.g. `profile-images` (no leading/trailing slashes). */
    doSpacesKeyPrefix: process.env.DO_SPACES_KEY_PREFIX ?? "profile-images",
    /**
     * Optional public base URL for objects (CDN or custom domain).
     * If unset, `https://{bucket}.{region}.digitaloceanspaces.com` is used.
     */
    doSpacesPublicBaseUrl: process.env.DO_SPACES_PUBLIC_BASE_URL,

    geminiApiKey: process.env.GEMINI_API_KEY!,

    /** AES-256-GCM message encryption key (32 bytes / 64 hex chars). Loaded from Doppler. */
    messageEncryptionKey: process.env.MESSAGE_ENCRYPTION_KEY,
    messageEncryptionKeyPrevious: process.env.MESSAGE_ENCRYPTION_KEY_PREVIOUS,
};

export default config;