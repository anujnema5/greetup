const DEFAULT_APP_ORIGIN = "http://localhost:3000";
const DEFAULT_SOCKET_ORIGIN = "http://localhost:5300";
export const SITE_DOMAIN = "greetup.co";
export const PRODUCTION_ORIGIN = `https://${SITE_DOMAIN}`;

function trim(url: string): string {
  return url.replace(/\/+$/, "");
}

export const CURRENT_HOST = trim(
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.CURRENT_HOST?.trim() ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : DEFAULT_APP_ORIGIN),
);

export const SOCKET_SERVER_URL = trim(
  process.env.NEXT_PUBLIC_SOCKET_SERVER_URL?.trim() || DEFAULT_SOCKET_ORIGIN,
);

const envApi = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const apiRoot = envApi ? trim(envApi) : null;

export const API_BASE_URL = apiRoot
  ? apiRoot.endsWith("/api")
    ? apiRoot
    : `${apiRoot}/api`
  : `${CURRENT_HOST}/api`;

export const RTC_SOCKET_URL =
  process.env.NEXT_PUBLIC_RTC_SOCKET_URL ?? "http://localhost:5370";

export const NSFW_LOG_ENABLED = process.env.NEXT_PUBLIC_NSFW_LOG_ENABLED === "true";
export const NSFW_SCAN_INTERVAL_MS = process.env.NEXT_PUBLIC_NSFW_SCAN_INTERVAL_MS ? parseInt(process.env.NEXT_PUBLIC_NSFW_SCAN_INTERVAL_MS) : 1000;
export const NSFWJS_IS_ENABLED = process.env.NEXT_PUBLIC_NSFWJS_IS_ENABLED === "true";

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";