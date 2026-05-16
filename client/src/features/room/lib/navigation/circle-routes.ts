/** Reserved segment while finding the next direct-call peer. */
export const CIRCLE_SEARCH_SEGMENT = "search";

export const CIRCLE_SEARCH_PATH = `/circle/${CIRCLE_SEARCH_SEGMENT}`;

type CircleRouter = { replace: (href: string, options?: { scroll: boolean }) => void };

export function goToCircleSearch(router: CircleRouter): void {
  router.replace(CIRCLE_SEARCH_PATH, { scroll: false });
}

export function circleRoomPath(roomId: string): string {
  return `/circle/${roomId}`;
}

export function isCircleSearchRoomId(roomId: string | null | undefined): boolean {
  return roomId === CIRCLE_SEARCH_SEGMENT;
}

export function resolveApiRoomId(routeRoomId: string | null | undefined): string | null {
  if (!routeRoomId || isCircleSearchRoomId(routeRoomId)) return null;
  return routeRoomId;
}

/** `[roomId]` is missing on the static `/circle/search` page. */
export function resolveCircleRouteRoomId(
  params: { roomId?: string | string[] },
  pathname: string,
): string {
  const raw = params.roomId;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (pathname === CIRCLE_SEARCH_PATH) return CIRCLE_SEARCH_SEGMENT;
  return "";
}
