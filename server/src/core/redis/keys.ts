export const USER_PRESENCE_KEYS = {
  ONLINE_USER_IPS: "online_users:",
  ONLINE_USERS_SET: "all_online_users",
  USER_LAST_SEEN: "user:last_seen:",
} as const;

export const USER_CACHE_KEYS = {
  PROFILE_SNAPSHOT: "user:profile:snapshot:",
} as const;

export const USER_BLOCK_KEYS = {
  /** Users this user has blocked. */
  outgoing: (userId: string) => `user:blocks:outgoing:${userId}`,
  /** Users who have blocked this user. */
  incoming: (userId: string) => `user:blocks:incoming:${userId}`,
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

export const ROOM_KEYS = {
  ROOM: "room:",
} as const;

export const ROOM_TTL = 7200; // 2 HOURS

export const CONNECTION_CALL_KEYS = {
  invite: (requestId: string) => `connection:call:invite:${requestId}`,
  pendingForCallee: (userId: string) => `connection:call:pending:${userId}`,
  pendingByRoom: (roomId: string) => `connection:call:room:${roomId}`,
  activeByRoom: (roomId: string) => `connection:call:active:${roomId}`,
  historyLogged: (roomId: string) => `connection:call:logged:${roomId}`,
  /** Prevents duplicate chat rows when client + server timeout race. */
  historyLoggedForRequest: (requestId: string) => `connection:call:history:request:${requestId}`,
} as const;

/** How long the UI rings before treating the call as missed/no-answer. */
export const CONNECTION_CALL_RING_DURATION_SEC = 60;

/** Redis invite TTL — longer than ring duration so timeout APIs can still read the invite. */
export const CONNECTION_CALL_INVITE_TTL_SEC = 120;

export const CHAT_KEYS = {
  unreadCounts: (userId: string) =>
    `chat:unread:${userId}`,               // HASH { convId → count }

  typingMember: (conversationId: string, userId: string) =>
    `chat:typing:${conversationId}:${userId}`, // STRING, EX 3

  messageRate: (userId: string) =>
    `chat:rate:${userId}`,                 // STRING, INCR + EX 60

  onlineUsers: () =>
    `chat:online`,                         // SET of userId

  socketCount: (userId: string) =>
    `chat:socket-count:${userId}`,         // STRING, INCR/DECR
} as const;

export const CHAT_TYPING_TTL = 3;     // seconds
export const CHAT_RATE_WINDOW = 60;   // seconds
export const CHAT_RATE_LIMIT = 60;   // messages per window

// CACHE TTL VALUES (IN SECONDS)
export const CACHE_TTL = {
  SHORT: 300,        // 5 MINUTES
  MEDIUM: 1800,      // 30 MINUTES
  LONG: 3600,        // 1 HOUR
  VERY_LONG: 86400,  // 24 HOURS
} as const;
