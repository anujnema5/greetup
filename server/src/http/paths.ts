/**
 * Canonical URL prefixes for the Hono app. Keeps bootstrap and tests aligned on paths.
 */
export const HTTP_PATHS = {
  api: "/api",
  /**
   * Better Auth handler — trailing `*` is Hono’s greedy wildcard (matches `/get-session`, `/callback/...`, etc.).
   * Do not use `**` here: Hono splits on `/`, so `**` is a literal segment and auth URLs would 404.
   */
  authGlob: "/api/auth/*",
  internal: "/internal",
  root: "/",
} as const;
