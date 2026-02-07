export const REDIS_KEYS = {
    PROFILE_STEPS: "profile:steps:",
    USER_SESSION: "session:user:",
    PROFILE_DATA: "profile:data:",
    MATCHING_QUEUE: "matching:queue:",
    PROFILE_OPTIONS: "profile:options"
    // Add more as needed
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
    SHORT: 300,        // 5 minutes
    MEDIUM: 1800,      // 30 minutes
    LONG: 3600,        // 1 hour
    VERY_LONG: 86400,  // 24 hours
    EXTRA_LONG: 86400,
} as const;