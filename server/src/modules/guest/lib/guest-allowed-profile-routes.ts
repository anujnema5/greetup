/** Profile GET route suffixes guests may call (mounted at `/profile` on the API router). */
export const GUEST_ALLOWED_PROFILE_GET_SUFFIXES = [
  "/match-prep/options",
  "/match-prep/current",
] as const;

function matchesGuestProfileSuffix(reqPath: string, suffix: string): boolean {
  return (
    reqPath === suffix ||
    reqPath === `/profile${suffix}` ||
    reqPath.endsWith(`/profile${suffix}`)
  );
}

export function isGuestAllowedProfileRequest(method: string, reqPath: string): boolean {
  if (method !== "GET") {
    return false;
  }

  return GUEST_ALLOWED_PROFILE_GET_SUFFIXES.some((suffix) =>
    matchesGuestProfileSuffix(reqPath, suffix),
  );
}
