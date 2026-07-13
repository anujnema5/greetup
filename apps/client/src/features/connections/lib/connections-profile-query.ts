/** Query param key for the desktop connections profile side panel. */
export const CONNECTIONS_PROFILE_QUERY_KEY = "profile";

export function connectionsProfileFromSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParamsLike,
): string | null {
  const raw = searchParams.get(CONNECTIONS_PROFILE_QUERY_KEY)?.trim();
  return raw || null;
}

type ReadonlyURLSearchParamsLike = {
  get(name: string): string | null;
};

export function buildConnectionsPath(
  pathname: string,
  searchParams: URLSearchParams,
  profileUsername: string | null,
): string {
  const params = new URLSearchParams(searchParams.toString());

  if (profileUsername?.trim()) {
    params.set(CONNECTIONS_PROFILE_QUERY_KEY, profileUsername.trim());
  } else {
    params.delete(CONNECTIONS_PROFILE_QUERY_KEY);
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
