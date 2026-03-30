/** Remember which in-app route to return to when leaving the full-screen room (minimize / end). */

const RETURN_KEY = "circlo-call-return-path";

export function setCallReturnPath(path: string): void {
  try {
    if (!path || path.startsWith("/room")) return;
    sessionStorage.setItem(RETURN_KEY, path);
  } catch {
    /* ignore */
  }
}

export function getCallReturnPath(): string | null {
  try {
    return sessionStorage.getItem(RETURN_KEY);
  } catch {
    return null;
  }
}

export function clearCallReturnPath(): void {
  try {
    sessionStorage.removeItem(RETURN_KEY);
  } catch {
    /* ignore */
  }
}
