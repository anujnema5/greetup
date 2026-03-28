import "./load-env";

const config = {
    env: process.env.NODE_ENV || "development",
    port: parseInt(process.env.PORT || "5050"),
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
};

export default config;