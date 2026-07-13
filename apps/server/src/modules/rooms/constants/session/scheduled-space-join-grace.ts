/**
 * After `scheduled_start_at`, a circle may stay `scheduled` (host hasn’t opened yet, or stragglers)
 * before `syncPastDueSpaceRoomExpiry` marks it expired. Keeps late joins possible without tying
 * “expired” to the exact start instant.
 */
export const SCHEDULED_JOIN_GRACE_AFTER_START_MINUTES = 120;
