/**
 * RTK Query `unwrap()` rejects with a `FetchBaseQueryError`-like object; surface `data.message` when present.
 */
export function getRtkMutationErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const data = (error as { data?: unknown }).data;
  if (data && typeof data === "object" && "message" in data) {
    const msg = (data as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
  }
  const top = (error as { error?: unknown }).error;
  if (typeof top === "string" && top.trim().length > 0) return top;
  return fallback;
}
