import config from "@/shared/config/config";
import logger from "@/core/logging";

const STATE_COOKIE_MARKERS = ["better-auth.state", "oauth_state"];

type CookiePresence = {
  cookieHeaderPresent: boolean;
  cookieCount: number;
  authCookieNames: string[];
  hasStateCookie: boolean;
  stateCookieNames: string[];
};

function parseCookieNames(cookieHeader: string | null | undefined): string[] {
  if (!cookieHeader) return [];
  return cookieHeader
    .split(";")
    .map((part) => part.trim().split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name));
}

export function getAuthCookiePresence(cookieHeader: string | null | undefined): CookiePresence {
  const names = parseCookieNames(cookieHeader);
  const authCookieNames = names.filter((name) => name.includes("better-auth"));
  const stateCookieNames = names.filter((name) =>
    STATE_COOKIE_MARKERS.some((marker) => name.includes(marker)),
  );

  return {
    cookieHeaderPresent: Boolean(cookieHeader),
    cookieCount: names.length,
    authCookieNames,
    hasStateCookie: stateCookieNames.length > 0,
    stateCookieNames,
  };
}

function summarizeSetCookie(headers: Headers): {
  setCookieCount: number;
  setCookieNames: string[];
  setStateCookie: boolean;
  stateCookieDomain: string | null;
  stateCookieSameSite: string | null;
  stateCookieSecure: boolean | null;
} {
  const raw = headers.getSetCookie?.() ?? [];
  const setCookieNames: string[] = [];
  let setStateCookie = false;
  let stateCookieDomain: string | null = null;
  let stateCookieSameSite: string | null = null;
  let stateCookieSecure: boolean | null = null;

  for (const entry of raw) {
    const [pair, ...attrs] = entry.split(";").map((s) => s.trim());
    const name = pair?.split("=")[0]?.trim();
    if (!name) continue;
    setCookieNames.push(name);

    const isState = STATE_COOKIE_MARKERS.some((marker) => name.includes(marker));
    if (!isState) continue;

    setStateCookie = true;
    for (const attr of attrs) {
      const lower = attr.toLowerCase();
      if (lower.startsWith("domain=")) stateCookieDomain = attr.slice(7);
      if (lower.startsWith("samesite=")) stateCookieSameSite = attr.slice(9);
      if (lower === "secure") stateCookieSecure = true;
    }
    if (stateCookieSecure === null) stateCookieSecure = false;
  }

  return {
    setCookieCount: raw.length,
    setCookieNames: setCookieNames.filter((name) => name.includes("better-auth")),
    setStateCookie,
    stateCookieDomain,
    stateCookieSameSite,
    stateCookieSecure,
  };
}

function oauthPathKind(pathname: string): "callback" | "sign-in-social" | null {
  if (pathname.includes("/callback/")) return "callback";
  if (pathname.endsWith("/sign-in/social") || pathname.includes("/sign-in/social")) {
    return "sign-in-social";
  }
  return null;
}

function locationError(location: string | null): string | null {
  if (!location) return null;
  try {
    const url = new URL(location, "http://localhost");
    return url.searchParams.get("error");
  } catch {
    const match = location.match(/[?&]error=([^&]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  }
}

/**
 * Logs OAuth sign-in start + Google callback cookie/redirect diagnostics.
 * Helps diagnose intermittent `state_mismatch` (signed state cookie missing vs Google `state`).
 */
export async function handleAuthWithOAuthDiagnostics(
  request: Request,
  handler: (request: Request) => Promise<Response> | Response,
): Promise<Response> {
  const url = new URL(request.url);
  const kind = oauthPathKind(url.pathname);
  if (!kind) {
    return handler(request);
  }

  const cookiePresence = getAuthCookiePresence(request.headers.get("cookie"));
  const queryState = url.searchParams.get("state");
  const requestMeta = {
    kind,
    method: request.method,
    path: url.pathname,
    host: request.headers.get("host"),
    origin: request.headers.get("origin"),
    referer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
    authCookieDomain: config.authCookieDomain ?? null,
    xfProto: request.headers.get("x-forwarded-proto"),
    xfHost: request.headers.get("x-forwarded-host"),
    ...cookiePresence,
    queryStatePresent: Boolean(queryState),
    queryStatePrefix: queryState ? queryState.slice(0, 8) : null,
    queryError: url.searchParams.get("error"),
  };

  if (kind === "callback") {
    logger.info("OAuth callback request", requestMeta);
    if (!cookiePresence.hasStateCookie) {
      logger.warn("OAuth callback missing state cookie (likely state_mismatch)", requestMeta);
    }
  } else {
    logger.info("OAuth social sign-in request", requestMeta);
  }

  const startedAt = Date.now();
  const response = await handler(request);
  const location = response.headers.get("location");
  const redirectError = locationError(location);
  const setCookieSummary = summarizeSetCookie(response.headers);

  const responseMeta = {
    ...requestMeta,
    status: response.status,
    durationMs: Date.now() - startedAt,
    location,
    redirectError,
    ...setCookieSummary,
  };

  if (redirectError === "state_mismatch" || redirectError === "please_restart_the_process") {
    logger.error("OAuth callback redirected with state error", {
      ...responseMeta,
      diagnosis: !cookiePresence.hasStateCookie
        ? "oauth_state_cookie_absent_on_callback"
        : "oauth_state_cookie_present_but_invalid",
      hint:
        "Cookie strategy expects encrypted `better-auth.oauth_state` on the Google callback. Absent/blocked cookie or secret rotate mid-flow → state error.",
    });
  } else if (kind === "sign-in-social") {
    logger.info("OAuth social sign-in response", responseMeta);
    if (!setCookieSummary.setStateCookie) {
      logger.warn("OAuth social sign-in did not Set-Cookie state", responseMeta);
    }
  } else {
    logger.info("OAuth callback response", responseMeta);
  }

  return response;
}
