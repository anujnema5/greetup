/** Max continuous live duration for a 1:1 direct call. */
export const DIRECT_SESSION_MAX_MS = 2 * 60 * 60 * 1000;

/** Max continuous live duration for a circle call (instant or scheduled). */
export const CIRCLE_SESSION_MAX_MS = 3 * 60 * 60 * 1000;

/**
 * Scheduled circle: no active participants for this long after `scheduled_start_at`
 * → room should end (reconcile / empty-room rule).
 */
export const SCHEDULED_EMPTY_ROOM_GRACE_MS = 2 * 60 * 60 * 1000;

export const DIRECT_SESSION_MAX_MINUTES = DIRECT_SESSION_MAX_MS / 60_000;
export const CIRCLE_SESSION_MAX_MINUTES = CIRCLE_SESSION_MAX_MS / 60_000;
export const SCHEDULED_EMPTY_ROOM_GRACE_MINUTES = SCHEDULED_EMPTY_ROOM_GRACE_MS / 60_000;
