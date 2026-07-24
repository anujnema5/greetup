/**
 * Detects Better Auth session cookies without validating them.
 * Presence alone is not proof of auth — always call `auth.api.getSession` when true.
 */
export function hasBetterAuthSessionCookie(
  cookieHeader: string | null | undefined,
): boolean {
  if (!cookieHeader) return false;
  return (
    cookieHeader.includes("better-auth.session_token") ||
    cookieHeader.includes("__Secure-better-auth.session_token")
  );
}
