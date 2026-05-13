/**
 * After the last participant leaves a **live** circle and `deleteCircleAfterCall` is off,
 * `expires_at` is set to roughly `now + this many minutes` (capped by `scheduled_end_at` and any
 * sooner existing `expires_at`) so the listing drops and joins/tokens fail without a cron.
 */
export const EMPTY_LIVE_CIRCLE_GRACE_AFTER_LAST_LEAVES_MINUTES = 30;
