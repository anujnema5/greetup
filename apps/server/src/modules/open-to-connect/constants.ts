/** How long a connect request stays pending before expiring. */
export const CONNECT_REQUEST_TTL_MS = 5 * 60 * 1000;

/** Max pending inbound requests per open user. */
export const CONNECT_REQUEST_MAX_INBOUND_PENDING = 3;

/** Outbound connect requests per user per hour. */
export const CONNECT_REQUEST_OUTBOUND_RATE_LIMIT = 10;

/** Cooldown after reject before the same pair can request again. */
export const CONNECT_REQUEST_REJECT_COOLDOWN_MS = 15 * 60 * 1000;

/** Max open users returned to an active searcher. */
export const SEARCH_SUGGESTIONS_LIMIT = 5;

/** How long after no_match a user may fetch search suggestions. */
export const RECENT_NO_MATCH_SUGGESTIONS_TTL_SEC = 120;

export const CONNECT_REQUEST_RATE_KEY_PREFIX = "otc:rate:outbound:";
