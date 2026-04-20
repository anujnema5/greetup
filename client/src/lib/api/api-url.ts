import { API_BASE_URL } from "@/shared/constants/environments";

const DEFAULT_ORIGIN = "http://localhost:5300";

/**
 * Full URL to a route mounted under Hono's `/api` prefix.
 * `NEXT_PUBLIC_API_BASE_URL` may be `http://host:port` or `http://host:port/api` (RTK style);
 * this avoids `/api/api/...` when the env already includes `/api`.
 *
 * @param pathAfterApi - path starting with `/`, e.g. `/room/:id/rtc-token` (no `/api` prefix).
 */
export function apiUrl(pathAfterApi: string): string {
  const raw = (API_BASE_URL ?? DEFAULT_ORIGIN).trim();
  const base = raw.replace(/\/+$/, "");
  const path = pathAfterApi.startsWith("/") ? pathAfterApi : `/${pathAfterApi}`;
  if (base.endsWith("/api")) {
    return `${base}${path}`;
  }
  return `${base}/api${path}`;
}
