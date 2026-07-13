/** Minimum interests required before a guest can start match → call flow. */
export const GUEST_MATCH_PREP_MIN_INTERESTS = 2;

export const GUEST_DISPLAY_NAME_MIN_LENGTH = 2;
export const GUEST_DISPLAY_NAME_MAX_LENGTH = 30;

/** Guest Better Auth session lifetime. */
export const GUEST_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Non-deliverable email domain for guest accounts. */
export const GUEST_EMAIL_DOMAIN = "guest.greetup.invalid";

/**
 * Who guests may be paired with in matching (see docs/temp/guest-trial-architecture.md §6.1).
 * - `guest_and_registered` — launch default; guests match anyone searching.
 * - `guest_only` — future; guests match guests only, registered never see guests.
 */
export const GUEST_MATCH_POOL_VALUES = ["guest_and_registered", "guest_only"] as const;

export type GuestMatchPoolPolicy = (typeof GUEST_MATCH_POOL_VALUES)[number];

/** Launch default until platform traffic supports stricter isolation. */
export const GUEST_MATCH_POOL_DEFAULT: GuestMatchPoolPolicy = "guest_and_registered";

/** Max match searches per guest session (`no_match` retries count toward this). */
export const GUEST_MATCH_SEARCH_RETRY_LIMIT = 5;

/** Max continuous live duration for a direct guest match call (server session cap). */
export const GUEST_CALL_MAX_DURATION_MS = 10 * 60 * 1000;
