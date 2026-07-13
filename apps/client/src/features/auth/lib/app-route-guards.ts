/** Shared client route checks for auth gates and 401 handling. */

export const AUTH_REQUIRED_PATH_PREFIXES = [
  "/home",
  "/profile",
  "/settings",
  "/profile-setup",
  "/explore",
  "/connections",
  "/u",
  "/messages",
  "/spaces",
  "/open-now",
  "/chat",
  "/space",
] as const;

export function isTryRoute(pathname: string): boolean {
  return pathname === "/try" || pathname.startsWith("/try/");
}

/** Direct match room `/space/[roomId]` — not browse/search. */
export function isGuestSpaceMatchRoom(pathname: string): boolean {
  if (!pathname.startsWith("/space/")) return false;
  if (pathname === "/space/search" || pathname.startsWith("/space/search/")) {
    return false;
  }
  return /^\/space\/[^/]+$/.test(pathname);
}

export function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** App-shell paths that require a session (excludes /try and guest match rooms). */
export function isAuthRequiredPath(pathname: string): boolean {
  if (isTryRoute(pathname) || isGuestSpaceMatchRoom(pathname)) return false;
  return AUTH_REQUIRED_PATH_PREFIXES.some((prefix) =>
    pathMatchesPrefix(pathname, prefix),
  );
}

export function guestTrialLandingPath(trialConsumed: boolean): string {
  return trialConsumed ? "/try/complete" : "/try";
}
