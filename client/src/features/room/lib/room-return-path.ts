/** Remember which in-app route to return to when minimizing full-screen room video. */

const RETURN_KEY = "circlo-call-return-path";

export function setRoomReturnPath(path: string): void {
  try {
    if (!path || path === "/circle" || path.match(/^\/circle\/?$/)) return;
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
