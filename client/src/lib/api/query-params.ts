function isPresentQueryValue(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    !(typeof value === "string" && value.trim() === "")
  );
}

/**
 * Drops undefined / null / whitespace-only strings; trims other strings.
 * Use with RTK Query `query: () => ({ url, params: buildQueryParamsObject(...) })`.
 */
export function buildQueryParamsObject(paramsObj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(paramsObj)) {
    if (!isPresentQueryValue(value)) continue;
    out[key] = typeof value === "string" ? value.trim() : String(value);
  }
  return out;
}

/**
 * Same filtering as {@link buildQueryParamsObject}, returns a query string (no leading `?`).
 */
export function buildQueryParams(paramsObj: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(paramsObj)) {
    if (!isPresentQueryValue(value)) continue;
    const s = typeof value === "string" ? value.trim() : String(value);
    params.append(key, s);
  }
  return params.toString();
}
