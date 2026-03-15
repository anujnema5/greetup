export const USER_PRESENCE_KEYS = {
    ONLINE_USER_IPS: "online_users:",
    ONLINE_USERS_SET: "all_online_users",
    USER_LAST_SEEN: "user:last_seen:",
} as const;

// MATCHING ENGINE KEYS
export const MATCH_KEYS = {
  USER: "match:user:",
  IDX_GENDER: "match:idx:gender:",
  IDX_ONLINE: "match:idx:online",
  IDX_COUNTRY: "match:idx:country:",
  IDX_INTEREST: "match:idx:interest:",
  IDX_GOAL: "match:idx:goal:",
  GEO_LOCATION: "match:geo:location",
  IDX_AGE: "match:idx:age",
} as const;

export const MATCH_TTL = 86400; // 24 HOURS

// CACHE TTL VALUES (IN SECONDS)
export const CACHE_TTL = {
    SHORT: 300,        // 5 MINUTES
    MEDIUM: 1800,      // 30 MINUTES
    LONG: 3600,        // 1 HOUR
    VERY_LONG: 86400,  // 24 HOURS
    EXTRA_LONG: 86400,
} as const;