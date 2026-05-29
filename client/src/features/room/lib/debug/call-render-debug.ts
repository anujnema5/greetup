const STORAGE_KEY = "CALL_RENDER_DEBUG";

export function isCallRenderDebugEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function logCallRender(scope: string, detail?: Record<string, unknown>): void {
  if (!isCallRenderDebugEnabled()) return;
  const ts = new Date().toISOString().slice(11, 23);
  if (detail) {
    console.info(`[call-render ${ts}] ${scope}`, detail);
  } else {
    console.info(`[call-render ${ts}] ${scope}`);
  }
}
