/**
 * Human-readable message from RTK Query / `fetchBaseQuery` error shapes.
 * Shared across features that use `baseApi` injectEndpoints.
 */
export function getRtkQueryErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.data === "string") return e.data;
    if (e.data && typeof e.data === "object" && "message" in e.data) {
      return String((e.data as { message: unknown }).message);
    }
    if (typeof e.error === "string") return e.error;
    if (typeof e.message === "string") return e.message;
  }
  return "Network error";
}
