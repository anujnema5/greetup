/**
 * User-facing strings for API JSON (`message` on success/error payloads).
 *
 * - Keep operational / validation messages here when they are reused.
 * - For unexpected 5xx responses, never surface database or query details — use
 *   {@link CLIENT_SAFE_INTERNAL_MESSAGE} only.
 */

/** Generic copy for any unexpected 5xx; safe to expose to clients. */
export const CLIENT_SAFE_INTERNAL_MESSAGE =
  "Something went wrong. Please try again later.";
