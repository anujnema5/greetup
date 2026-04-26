import { API_BASE_URL } from "@/shared/constants/environments";

/**
 * Full URL under Hono's `/api` (e.g. `/room/:id/rtc-token`). {@link API_BASE_URL} already ends with `/api`.
 */
export function apiUrl(pathAfterApi: string): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const path = pathAfterApi.startsWith("/") ? pathAfterApi : `/${pathAfterApi}`;
  return `${base}${path}`;
}
