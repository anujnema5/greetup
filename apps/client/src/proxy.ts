import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL, PRODUCTION_ORIGIN, SITE_DOMAIN } from "@/shared/constants/environments";

/** 301 www/http variants to https://greetup.co (fixes Search Console duplicate canonical). */
function canonicalOriginRedirect(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const hostHeader = req.headers.get("host") ?? "";
  const hostname = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const isHttps = forwardedProto === "https" || req.nextUrl.protocol === "https:";
  const isCanonicalHost = hostname === SITE_DOMAIN;

  if (isCanonicalHost && isHttps) {
    return null;
  }

  const destination = new URL(req.nextUrl.pathname + req.nextUrl.search, PRODUCTION_ORIGIN);
  return NextResponse.redirect(destination, 308);
}

/**
 * Session checks must hit the same API host the browser uses for cookies.
 * In production that is api.* (NEXT_PUBLIC_API_BASE_URL). Same-origin `/api`
 * rewrites to API_BACKEND_ORIGIN at build time (defaults to localhost:5300),
 * which is unreachable inside the client App Platform container.
 *
 * Replace `localhost` → `127.0.0.1` so Node does not resolve to `::1` while
 * the API listens on IPv4 only (common Windows ECONNREFUSED failure).
 */
function middlewareApiBase(req: NextRequest): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
    ? API_BASE_URL
    : `${req.nextUrl.origin}/api`;
  return base.replace("//localhost", "//127.0.0.1");
}

// ==================== ROUTES CONFIGURATION ====================
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const PROTECTED_ROUTES = [
  "/home",
  "/profile",
  "/settings",
  "/profile-setup",
  "/explore",
  "/connections",
  "/u",
  "/messages",
  "/spaces",
  "/open-now",
  "/chat",
  "/space",
];

/** Routes that require onboarding to be complete (everything protected except setup). */
const ONBOARDING_REQUIRED_ROUTES = PROTECTED_ROUTES.filter(
  (route) => route !== "/profile-setup",
);
const ONBOARDING_ROUTE = "/profile-setup";

/** Guest trial shell — anonymous may visit; session created client-side. */
const GUEST_TRIAL_ROUTE = "/try";
const GUEST_TRIAL_COMPLETE_ROUTE = "/try/complete";

/** Full-app routes guests must not access (server also enforces). */
const GUEST_BLOCKED_ROUTES = [
  ...PROTECTED_ROUTES.filter((route) => route !== "/space"),
  "/space/search",
];

const COMMON_ROUTES = [
  "/about",
  "/contact",
  "/pricing",
  "/features",
  "/blog",
  "/help",
  "/faq",
  "/terms",
  "/privacy",
  "/community-guidelines",
];

// ==================== CACHE CONFIGURATION ====================
interface GuestStatusSnapshot {
  isGuest: boolean;
  trialConsumed: boolean;
}

interface CacheEntry {
  isLoggedIn: boolean;
  isOnboarded?: boolean;
  guestStatus?: GuestStatusSnapshot;
  timestamp: number;
  inProgress?: Promise<AuthCheckResult>;
  guestStatusInProgress?: Promise<GuestStatusSnapshot | null>;
}

interface AuthCheckResult {
  isLoggedIn: boolean;
  isOnboarded?: boolean;
}

const sessionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 1000; // short TTL — avoids serving dead sessions as logged-in
const MAX_CACHE_SIZE = 500; // Prevent cache poisoning
/** Prod auth checks go public api.* via Cloudflare — 3s was failing open on `/`. */
const AUTH_REQUEST_TIMEOUT_MS =
  process.env.NODE_ENV === "production" ? 8000 : 3000;
const SESSION_COOKIE_KEYS = [
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
];

// ==================== MAIN PROXY FUNCTION ====================
// ⭐ Changed from 'middleware' to 'proxy'
export async function proxy(req: NextRequest) {
  const canonicalRedirect = canonicalOriginRedirect(req);
  if (canonicalRedirect) {
    return canonicalRedirect;
  }

  const { pathname } = req.nextUrl;

  // Skip proxy for static files and API routes
  if (shouldSkipProxy(pathname)) {
    return NextResponse.next();
  }

  // Legacy landing path is retired; keep a hard redirect.
  if (pathname === "/landing") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Check authentication with proper error handling
  let isLoggedIn = false;
  try {
    isLoggedIn = await checkAuthWithCache(req);
  } catch (error) {
    console.error("Critical auth check error:", error);
    isLoggedIn = false;
  }

  // Handle common routes (accessible to everyone)
  if (isCommonRoute(pathname)) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  const guestStatus = isLoggedIn ? await checkGuestStatusWithCache(req) : null;

  // Anonymous: allow /try; deep-link to match room → start guest flow
  if (!isLoggedIn) {
    if (isGuestTrialRoute(pathname)) {
      const response = NextResponse.next();
      setSecurityHeaders(response);
      return response;
    }
    if (isGuestSpaceMatchRoom(pathname)) {
      return NextResponse.redirect(new URL(GUEST_TRIAL_ROUTE, req.url));
    }
  }

  // Guest trial routing (logged-in guest or full user on guest-only paths)
  const guestRedirect = await resolveGuestRouteRedirect(req, pathname, isLoggedIn, guestStatus);
  if (guestRedirect) {
    return guestRedirect;
  }

  // Redirect full accounts away from marketing home (guests may browse landing)
  if (isLoggedIn && pathname === "/" && !guestStatus?.isGuest) {
    const isOnboarded = await resolveIsOnboarded(req, pathname);
    const redirectUrl = isOnboarded ? "/home" : ONBOARDING_ROUTE;
    const redirect = NextResponse.redirect(new URL(redirectUrl, req.url));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  // Redirect logged-in users away from public routes (guests may finish signup / verify email)
  if (isLoggedIn && PUBLIC_ROUTES.includes(pathname)) {
    if (guestStatus?.isGuest && isGuestAccountConversionRoute(pathname)) {
      const response = NextResponse.next();
      setSecurityHeaders(response);
      return response;
    }

    const isOnboarded = await resolveIsOnboarded(req, pathname);
    const redirectUrl = isOnboarded ? "/home" : ONBOARDING_ROUTE;
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // Unauthenticated users belong on the marketing home — not /login.
  if (!isLoggedIn && isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Redirect onboarded users away from profile-setup (they're done)
  if (isLoggedIn && isOnboardingRoute(pathname)) {
    const isOnboarded = await resolveIsOnboarded(req, pathname);
    if (isOnboarded) {
      return NextResponse.redirect(new URL("/home", req.url));
    }
  }

  // Redirect logged-in but not-onboarded users away from onboarding-required routes.
  // Guests never complete full onboarding — their allowed routes (including the
  // `/space/[roomId]` match room) are already governed by resolveGuestRouteRedirect
  // above, so never bounce a guest to /profile-setup here.
  if (
    isLoggedIn &&
    !guestStatus?.isGuest &&
    isOnboardingRequiredRoute(pathname) &&
    !isOnboardingRoute(pathname)
  ) {
    const isOnboarded = await resolveIsOnboarded(req, pathname);
    if (!isOnboarded) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, req.url));
    }
  }

  const response = NextResponse.next();
  setSecurityHeaders(response);

  return response;
}

// ==================== HELPER FUNCTIONS ====================

function shouldSkipProxy(pathname: string): boolean {
  const skipPatterns = [
    /^\/_next/,
    /^\/api/,
    /^\/static/,
    /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|json|woff|woff2|ttf|eot|otf|pdf)$/,
  ];

  return skipPatterns.some((pattern) => pattern.test(pathname));
}

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );
}

function isOnboardingRequiredRoute(pathname: string): boolean {
  return ONBOARDING_REQUIRED_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route)
  );
}

function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE;
}

function isCommonRoute(pathname: string): boolean {
  if (COMMON_ROUTES.includes(pathname)) {
    return true;
  }

  return COMMON_ROUTES.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname.startsWith(route + "/");
  });
}

function isGuestTrialRoute(pathname: string): boolean {
  return pathname === GUEST_TRIAL_ROUTE || pathname.startsWith(`${GUEST_TRIAL_ROUTE}/`);
}

function isGuestTrialCompleteRoute(pathname: string): boolean {
  return (
    pathname === GUEST_TRIAL_COMPLETE_ROUTE ||
    pathname.startsWith(`${GUEST_TRIAL_COMPLETE_ROUTE}/`)
  );
}

/** Direct match room `/space/[roomId]` — not browse/search. */
function isGuestSpaceMatchRoom(pathname: string): boolean {
  if (!pathname.startsWith("/space/")) {
    return false;
  }
  if (pathname === "/space/search" || pathname.startsWith("/space/search/")) {
    return false;
  }
  return /^\/space\/[^/]+$/.test(pathname);
}

/** Routes guests use while upgrading to a full account — must not bounce to /try. */
function isGuestAccountConversionRoute(pathname: string): boolean {
  return (
    pathname === "/register" ||
    pathname === "/login" ||
    pathname === "/verify-email" ||
    pathname === ONBOARDING_ROUTE ||
    pathname.startsWith(`${ONBOARDING_ROUTE}/`)
  );
}

function isGuestBlockedRoute(pathname: string): boolean {
  return GUEST_BLOCKED_ROUTES.some((route) =>
    route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`),
  );
}

function guestTrialLandingPath(trialConsumed: boolean): string {
  return trialConsumed ? GUEST_TRIAL_COMPLETE_ROUTE : GUEST_TRIAL_ROUTE;
}

/** Marketing home — guests may leave /try and browse the landing page. */
function isGuestPublicMarketingRoute(pathname: string): boolean {
  return pathname === "/";
}

async function resolveGuestRouteRedirect(
  req: NextRequest,
  pathname: string,
  isLoggedIn: boolean,
  guestStatus: GuestStatusSnapshot | null,
): Promise<NextResponse | null> {
  if (!isLoggedIn) {
    return null;
  }

  // Full account: no guest trial shell
  if (guestStatus && !guestStatus.isGuest) {
    if (isGuestTrialRoute(pathname)) {
      return NextResponse.redirect(new URL("/home", req.url));
    }
    return null;
  }

  if (!guestStatus?.isGuest) {
    return null;
  }

  const trialLanding = guestTrialLandingPath(guestStatus.trialConsumed);

  if (isGuestPublicMarketingRoute(pathname)) {
    return null;
  }

  if (isGuestAccountConversionRoute(pathname)) {
    return null;
  }

  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL(trialLanding, req.url));
  }

  if (isGuestTrialRoute(pathname)) {
    if (guestStatus.trialConsumed && !isGuestTrialCompleteRoute(pathname)) {
      return NextResponse.redirect(new URL(GUEST_TRIAL_COMPLETE_ROUTE, req.url));
    }
    if (!guestStatus.trialConsumed && isGuestTrialCompleteRoute(pathname)) {
      return NextResponse.redirect(new URL(GUEST_TRIAL_ROUTE, req.url));
    }
    return null;
  }

  if (isGuestSpaceMatchRoom(pathname)) {
    return null;
  }

  if (isGuestBlockedRoute(pathname) || isProtectedRoute(pathname)) {
    return NextResponse.redirect(new URL(trialLanding, req.url));
  }

  return null;
}

// ==================== SECURITY HEADERS ====================
function originFromUrl(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return null;
  }
}

function wsOriginFromHttp(raw: string | undefined): string | null {
  const origin = originFromUrl(raw);
  if (!origin) return null;
  if (origin.startsWith("https://")) return `wss://${origin.slice("https://".length)}`;
  if (origin.startsWith("http://")) return `ws://${origin.slice("http://".length)}`;
  return origin;
}

function setSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  const isDevelopment = !isProduction;
  const apiOrigin =
    originFromUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ||
    (isProduction ? `https://api.${SITE_DOMAIN}` : null);
  const cdnOrigin = originFromUrl(process.env.NEXT_PUBLIC_CDN_URL);
  const socketOrigin = originFromUrl(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL);
  const socketWs = wsOriginFromHttp(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL);
  const rtcOrigin = originFromUrl(process.env.NEXT_PUBLIC_RTC_SOCKET_URL);
  const rtcWs = wsOriginFromHttp(process.env.NEXT_PUBLIC_RTC_SOCKET_URL);

  const connectSrc = [
    "'self'",
    apiOrigin,
    socketOrigin,
    socketWs,
    rtcOrigin,
    rtcWs,
    "https://*.googleapis.com",
    "https://*.gstatic.com",
    "https://www.google.com",
    "https://www.gstatic.com",
    "https://api.dicebear.com",
    // Presigned PUTs to DigitalOcean Spaces (profile photos, report screenshots).
    // Explicit CDN origin + wildcard so uploads work even if NEXT_PUBLIC_CDN_URL is unset.
    cdnOrigin,
    "https://*.digitaloceanspaces.com",
    isDevelopment ? "https://vercel.live" : null,
    isDevelopment ? "ws://localhost:*" : null,
    isDevelopment ? "wss://localhost:*" : null,
    isDevelopment ? "http://localhost:*" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const imgSrc = [
    "'self'",
    "data:",
    "blob:",
    "https:",
    cdnOrigin,
  ]
    .filter(Boolean)
    .join(" ");

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com${
      isDevelopment ? " https://vercel.live" : ""
    }`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src ${imgSrc}`,
    `connect-src ${connectSrc}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://www.google.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    isProduction ? "upgrade-insecure-requests" : "",
  ];

  response.headers.set(
    "Content-Security-Policy",
    cspDirectives.filter(Boolean).join("; "),
  );

  // Permissions-Policy: see `next.config.ts` (geolocation/cohort only; camera & mic omitted).
}

// ==================== CACHE MANAGEMENT ====================

function cleanExpiredCache(): void {
  const now = Date.now();
  let deletedCount = 0;

  for (const [key, value] of sessionCache.entries()) {
    if (now - value.timestamp >= CACHE_TTL) {
      sessionCache.delete(key);
      deletedCount++;
    }
  }

  if (sessionCache.size > MAX_CACHE_SIZE) {
    const entriesToDelete = sessionCache.size - MAX_CACHE_SIZE;
    const keys = Array.from(sessionCache.keys()).slice(0, entriesToDelete);
    keys.forEach((key) => sessionCache.delete(key));
    deletedCount += entriesToDelete;
  }

  if (deletedCount > 0) {
    console.log(`[Cache] Cleaned ${deletedCount} expired entries. Current size: ${sessionCache.size}`);
  }
}

// ==================== AUTH CHECK ====================

async function checkAuthWithCache(req: NextRequest): Promise<boolean> {
  cleanExpiredCache();

  const sessionToken = getSessionToken(req);

  if (!sessionToken) {
    return false;
  }

  if (sessionToken.length < 10 || sessionToken.length > 500) {
    console.warn("[Auth] Invalid session token format");
    return false;
  }

  const cached = sessionCache.get(sessionToken);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    if (cached.inProgress) {
      try {
        const result = await cached.inProgress;
        return result.isLoggedIn;
      } catch {
        console.warn("[Auth] In-progress request failed, retrying");
        sessionCache.delete(sessionToken);
        // Fall through to a fresh check — never return stale isLoggedIn after failure.
      }
    } else {
      return cached.isLoggedIn;
    }
  }

  const authCheckPromise = performAuthCheck(req);
  const entry = sessionCache.get(sessionToken);

  if (entry) {
    entry.inProgress = authCheckPromise;
  } else {
    sessionCache.set(sessionToken, {
      isLoggedIn: false,
      timestamp: now,
      inProgress: authCheckPromise,
    });
  }

  try {
    const result = await authCheckPromise;

    writeSessionCache(sessionToken, result, now);

    return result.isLoggedIn;
  } catch (error) {
    console.error("[Auth] Check failed:", error);
    sessionCache.delete(sessionToken);
    return false;
  }
}

async function performAuthCheck(req: NextRequest): Promise<AuthCheckResult> {
  const apiBaseUrl = middlewareApiBase(req);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${apiBaseUrl}/auth/get-session`, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        "Content-Type": "application/json",
        // Avoid Cloudflare bot challenges on server→api.* fetches.
        "User-Agent": "greetup-proxy-auth",
      },
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { isLoggedIn: false };
      }

      console.error(`[Auth] API returned status ${res.status}`);
      throw new Error(`Auth check failed with status ${res.status}`);
    }

    const data = await res.json();
    const isLoggedIn = !!data?.user;
    const isOnboarded = isLoggedIn && data.user.isOnboarded === true;

    if (isLoggedIn) {
      console.log(`[Auth] User authenticated: ${data.user.id || data.user.email || "unknown"}`);
    }

    return { isLoggedIn, isOnboarded };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error(`[Auth] Check timeout after ${AUTH_REQUEST_TIMEOUT_MS}ms`);
      } else {
        console.error("[Auth] Check error:", error.message);
      }
    }

    throw error;
  }
}

function writeSessionCache(
  sessionToken: string,
  result: AuthCheckResult,
  timestamp: number,
): void {
  sessionCache.set(sessionToken, {
    isLoggedIn: result.isLoggedIn,
    isOnboarded: result.isLoggedIn ? result.isOnboarded === true : false,
    timestamp,
  });
}

// ==================== GUEST STATUS CHECK ====================

async function checkGuestStatusWithCache(
  req: NextRequest,
): Promise<GuestStatusSnapshot | null> {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return null;
  }

  const cached = sessionCache.get(sessionToken);
  const now = Date.now();

  if (
    cached?.guestStatus &&
    now - cached.timestamp < CACHE_TTL
  ) {
    if (cached.guestStatusInProgress) {
      try {
        return await cached.guestStatusInProgress;
      } catch {
        // fall through to refetch
      }
    } else {
      return cached.guestStatus;
    }
  }

  const fetchPromise = performGuestStatusCheck(req);

  if (cached) {
    cached.guestStatusInProgress = fetchPromise;
  } else {
    sessionCache.set(sessionToken, {
      isLoggedIn: true,
      timestamp: now,
      guestStatusInProgress: fetchPromise,
    });
  }

  try {
    const guestStatus = await fetchPromise;
    const entry = sessionCache.get(sessionToken) ?? { isLoggedIn: true, timestamp: now };
    if (guestStatus) {
      entry.guestStatus = guestStatus;
    }
    entry.timestamp = now;
    delete entry.guestStatusInProgress;
    sessionCache.set(sessionToken, entry);
    return guestStatus;
  } catch (error) {
    console.error("[Guest] Status check failed:", error);
    const entry = sessionCache.get(sessionToken);
    if (entry) {
      delete entry.guestStatusInProgress;
    }
    return null;
  }
}

async function performGuestStatusCheck(
  req: NextRequest,
): Promise<GuestStatusSnapshot | null> {
  const apiBaseUrl = middlewareApiBase(req);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${apiBaseUrl}/guest/status`, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        "Content-Type": "application/json",
        "User-Agent": "greetup-proxy-auth",
      },
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 404 || res.status === 500) {
        return { isGuest: false, trialConsumed: false };
      }
      throw new Error(`Guest status failed with status ${res.status}`);
    }

    const data = await res.json();
    return {
      isGuest: !!data?.data?.isGuest,
      trialConsumed: !!data?.data?.trialConsumed,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ==================== ONBOARDING (from get-session cache) ====================

/**
 * `isOnboarded` is loaded with get-session in checkAuthWithCache.
 * Re-fetches only when cache is stale or user may have just completed setup.
 */
async function resolveIsOnboarded(
  req: NextRequest,
  pathname?: string,
): Promise<boolean> {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) return false;

  const cached = sessionCache.get(sessionToken);
  const now = Date.now();
  const cacheFresh = Boolean(cached && now - cached.timestamp < CACHE_TTL);
  const bypassCache = pathname === "/home" && cached?.isOnboarded === false;

  if (cacheFresh && !bypassCache && cached?.isOnboarded !== undefined) {
    return cached.isOnboarded;
  }

  try {
    const result = await performAuthCheck(req);
    writeSessionCache(sessionToken, result, now);
    return result.isLoggedIn ? result.isOnboarded === true : false;
  } catch {
    return false;
  }
}

function getSessionToken(req: NextRequest): string | undefined {
  for (const key of SESSION_COOKIE_KEYS) {
    const value = req.cookies.get(key)?.value;
    if (value) return value;

    // Better Auth splits oversized cookies into `.0`, `.1`, …
    const chunk0 = req.cookies.get(`${key}.0`)?.value;
    if (chunk0) return chunk0;
  }

  // Last resort: any cookie whose name starts with a known session key.
  for (const cookie of req.cookies.getAll()) {
    if (
      SESSION_COOKIE_KEYS.some(
        (key) => cookie.name === key || cookie.name.startsWith(`${key}.`),
      ) &&
      cookie.value
    ) {
      return cookie.value;
    }
  }

  return undefined;
}

// ==================== PROXY CONFIG ====================
// ⭐ Note: In Next.js 16, the config export stays the same
export const config = {
  matcher: [
    // Exclude sw.js so static `public/sw.js` is served without running this file.
    "/((?!_next/static|_next/image|favicon.ico|public|sw\\.js).*)",
  ],
};