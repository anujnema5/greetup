/**
 * RTK Query `unwrap()` rejects with a `FetchBaseQueryError`-like object; surface `data.message`
 * or the first Zod-style field error from the API when present.
 */
export function getRtkMutationErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const data = (error as { data?: unknown }).data;
  if (data && typeof data === "object") {
    const d = data as {
      message?: unknown;
      errors?: Array<{ field: string; messages: string[] }>;
    };
    if (Array.isArray(d.errors) && d.errors.length > 0) {
      const first = d.errors[0]?.messages?.[0];
      if (typeof first === "string" && first.trim().length > 0) return first;
    }
    if (typeof d.message === "string" && d.message.trim().length > 0) return d.message;
  }
  const top = (error as { error?: unknown }).error;
  if (typeof top === "string" && top.trim().length > 0) return top;
  return fallback;
}

/** API envelope `code` on mutation `unwrap()` errors (same shape as query errors). */
export function getRtkMutationErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const e = error as Record<string, unknown>;
  const data = e.data;
  if (data && typeof data === "object" && "code" in data) {
    const c = (data as { code?: unknown }).code;
    return typeof c === "string" && c.length > 0 ? c : null;
  }
  return null;
}
