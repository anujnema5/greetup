/**
 * Canonical URL prefixes for the Hono app. Keeps bootstrap and tests aligned on paths.
 */
export const HTTP_PATHS = {
  api: "/api",
  /** Better Auth handler — must stay a glob so all auth routes are delegated. */
  authGlob: "/api/auth/**",
  internal: "/internal",
  root: "/",
} as const;
