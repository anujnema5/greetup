/**
 * Human-readable message from RTK Query / `fetchBaseQuery` error shapes.
 * Shared across features that use `baseApi` injectEndpoints.
 */
export function getRtkQueryErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.data === "string") return e.data;
    if (e.data && typeof e.data === "object") {
      const d = e.data as {
        message?: unknown;
        errors?: Array<{ field: string; messages: string[] }>;
      };
      if (Array.isArray(d.errors) && d.errors.length > 0) {
        const first = d.errors[0]?.messages?.[0];
        if (typeof first === "string" && first.trim().length > 0) return first;
      }
      if ("message" in d) {
        return String(d.message);
      }
    }
    if (typeof e.error === "string") return e.error;
    if (typeof e.message === "string") return e.message;
  }
  return "Network error";
}

/** API envelope `code` when present (e.g. `LOBBY_WAITING_FOR_HOST`). */
export function getRtkQueryErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const e = error as Record<string, unknown>;
  const data = e.data;
  if (data && typeof data === "object" && "code" in data) {
    const c = (data as { code?: unknown }).code;
    return typeof c === "string" && c.length > 0 ? c : null;
  }
  return null;
}
