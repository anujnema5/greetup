const DEFAULT_APP_ORIGIN = "http://localhost:3000";
const DEFAULT_SOCKET_ORIGIN = "http://localhost:5300";

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Next.js origin (where the browser loads the app). Session cookies are set on this host via `/api` rewrites. */
export const CURRENT_HOST =
  trimTrailingSlashes(
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.CURRENT_HOST?.trim() ||
      DEFAULT_APP_ORIGIN,
  );

/**
 * Socket.IO connects directly to Hono (cannot use Next rewrites). Must stay reachable from the browser.
 */
export const SOCKET_SERVER_URL =
  trimTrailingSlashes(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL?.trim() || DEFAULT_SOCKET_ORIGIN);

/**
 * JSON API base (`{app}/api`). Defaults to same origin as the Next app so fetches hit rewrites and cookies work.
 * Override only if you intentionally call the API host directly (not recommended with Phone Auth on localhost).
 */
export const API_BASE_URL =
  trimTrailingSlashes(process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "") ||
  `${CURRENT_HOST}/api`;
/** rtc-service Socket.IO + mediasoup (browser must reach this URL) */
export const RTC_SOCKET_URL =
  process.env.NEXT_PUBLIC_RTC_SOCKET_URL ?? "http://localhost:5370";