/** Reserved segment while finding the next direct-call peer. */
export const SPACE_SEARCH_SEGMENT = "search";

export const SPACE_SEARCH_PATH = `/space/${SPACE_SEARCH_SEGMENT}`;

type SpaceRouter = { replace: (href: string, options?: { scroll: boolean }) => void };

export function goToSpaceSearch(router: SpaceRouter): void {
  router.replace(SPACE_SEARCH_PATH, { scroll: false });
}

export function spaceRoomPath(roomId: string): string {
  return `/space/${roomId}`;
}

export function isSpaceSearchRoomId(roomId: string | null | undefined): boolean {
  return roomId === SPACE_SEARCH_SEGMENT;
}

export function resolveApiRoomId(routeRoomId: string | null | undefined): string | null {
  if (!routeRoomId || isSpaceSearchRoomId(routeRoomId)) return null;
  return routeRoomId;
}

/** True for live room pages under `/space/…` (excludes browse `/spaces`). */
export function isSpaceRoomPath(pathname: string): boolean {
  return pathname === SPACE_SEARCH_PATH || pathname.startsWith("/space/");
}

export function isRealtimeRoomPath(pathname: string): boolean {
  return isSpaceRoomPath(pathname);
}

/** `[roomId]` is missing on the static `/space/search` page. */
export function resolveSpaceRouteRoomId(
  params: { roomId?: string | string[] },
  pathname: string,
): string {
  const raw = params.roomId;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (pathname === SPACE_SEARCH_PATH) {
    return SPACE_SEARCH_SEGMENT;
  }
  return "";
}
