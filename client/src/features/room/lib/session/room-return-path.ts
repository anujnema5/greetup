/** Remember which in-app route to return to when leaving full-screen room video. */

const RETURN_KEY = "greetup-call-return-path";

function isCircleRoomPath(path: string): boolean {
  return path === "/circle" || /^\/circle(\/|$)/.test(path);
}

export function setRoomReturnPath(path: string): void {
  try {
    if (!path || isCircleRoomPath(path)) return;
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

export function getRoomReturnPath(): string | null {
  try {
    return sessionStorage.getItem(RETURN_KEY);
  } catch {
    return null;
  }
}

export function clearRoomReturnPath(): void {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* ignore */
  }
}

/** Read the saved return route and clear it (one-shot leave navigation). */
export function consumeRoomReturnPath(fallback: string): string {
  const path = getRoomReturnPath() ?? fallback;
  clearRoomReturnPath();
  return path;
}
