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

function middlewareApiBase(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
    ? API_BASE_URL
    : `${req.nextUrl.origin}/api`;
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
];

/** Routes that require onboarding to be complete */
const ONBOARDING_REQUIRED_ROUTES = [
  "/home",
  "/profile",
  "/settings",
  "/explore",
  "/connections",
  "/u",
];
const ONBOARDING_ROUTE = "/profile-setup";

/** Guest trial shell — anonymous may visit; session created client-side. */
const GUEST_TRIAL_ROUTE = "/try";
const GUEST_TRIAL_COMPLETE_ROUTE = "/try/complete";

/** Full-app routes guests must not access (server also enforces). */
const GUEST_BLOCKED_ROUTES = [
  "/home",
  "/profile",
  "/settings",
  "/profile-setup",
  "/explore",
  "/connections",
  "/u",
  "/chat",
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
  isGuest?: boolean;
  guestTrialConsumed?: boolean;
  timestamp: number;
  inProgress?: Promise<AuthCheckResult>;
}

interface AuthCheckResult {
  isLoggedIn: boolean;
  isOnboarded?: boolean;
  isGuest?: boolean;
  guestTrialConsumed?: boolean;
}

const sessionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 60 seconds
const MAX_CACHE_SIZE = 500; // Prevent cache poisoning
const AUTH_REQUEST_TIMEOUT_MS = 3000;
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
  let authResult: AuthCheckResult = { isLoggedIn: false };
  try {
    authResult = await checkAuthWithCache(req);
  } catch (error) {
    console.error("Critical auth check error:", error);
    authResult = { isLoggedIn: false };
  }

  const isLoggedIn = authResult.isLoggedIn;

  // Handle common routes (accessible to everyone)
  if (isCommonRoute(pathname)) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  // Guest flags come from get-session (same round trip as isOnboarded)
  const guestStatus: GuestStatusSnapshot | null = isLoggedIn
    ? {
        isGuest: authResult.isGuest === true,
        trialConsumed: authResult.guestTrialConsumed === true,
      }
    : null;

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
    return NextResponse.redirect(new URL(redirectUrl, req.url));
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

  // Redirect non-logged-in users away from protected routes
  if (!isLoggedIn && isProtectedRoute(pathname)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect onboarded users away from profile-setup (they're done)
  if (isLoggedIn && isOnboardingRoute(pathname)) {
    const isOnboarded = await resolveIsOnboarded(req, pathname);
    if (isOnboarded) {
      return NextResponse.redirect(new URL("/home", req.url));
    }
  }

  // Redirect logged-in but not-onboarded users away from onboarding-required routes
  if (
    isLoggedIn &&
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
function setSecurityHeaders(response: NextResponse): void {
  // Basic security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  
  // HSTS - Force HTTPS
  // response.headers.set(
  //   "Strict-Transport-Security",
  //   "max-age=31536000; includeSubDomains; preload"
  // );

  // // Get environment-specific domains
  // const isDevelopment = process.env.NODE_ENV === "development";
  // const apiDomain = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  // const cdnDomain = process.env.NEXT_PUBLIC_CDN_URL || "";

  // // Content Security Policy - Modern XSS Protection
  // const cspDirectives = [
  //   "default-src 'self'",
  //   `script-src 'self' 'unsafe-inline' 'unsafe-eval'${
  //     isDevelopment ? " https://vercel.live" : ""
  //   }`,
  //   "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  //   "font-src 'self' https://fonts.gstatic.com data:",
  //   `img-src 'self' data: https: blob:${cdnDomain ? " " + cdnDomain : ""}`,
  //   `connect-src 'self'${apiDomain ? " " + apiDomain : ""}${
  //     isDevelopment ? " https://vercel.live ws://localhost:* wss://localhost:*" : ""
  //   }`,
  //   "frame-ancestors 'none'",
  //   "base-uri 'self'",
  //   "form-action 'self'",
  //   "upgrade-insecure-requests",
  //   "block-all-mixed-content",
  // ];

  // response.headers.set(
  //   "Content-Security-Policy",
  //   cspDirectives.filter(Boolean).join("; ")
  // );

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

async function checkAuthWithCache(req: NextRequest): Promise<AuthCheckResult> {
  cleanExpiredCache();

  const sessionToken = getSessionToken(req);

  if (!sessionToken) {
    return { isLoggedIn: false };
  }

  if (sessionToken.length < 10 || sessionToken.length > 500) {
    console.warn("[Auth] Invalid session token format");
    return { isLoggedIn: false };
  }

  const cached = sessionCache.get(sessionToken);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    if (cached.inProgress) {
      try {
        return await cached.inProgress;
      } catch {
        console.warn("[Auth] In-progress request failed, retrying");
      }
    }
    return {
      isLoggedIn: cached.isLoggedIn,
      isOnboarded: cached.isOnboarded,
      isGuest: cached.isGuest,
      guestTrialConsumed: cached.guestTrialConsumed,
    };
  }

  const authCheckPromise = performAuthCheck(req);

  if (cached) {
    cached.inProgress = authCheckPromise;
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

    return result;
  } catch (error) {
    console.error("[Auth] Check failed:", error);
    sessionCache.delete(sessionToken);
    return { isLoggedIn: false };
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
    const isGuest = isLoggedIn && data.user.isGuest === true;
    const guestTrialConsumed =
      isLoggedIn && data.user.guestTrialConsumed === true;

    if (isLoggedIn) {
      console.log(`[Auth] User authenticated: ${data.user.id || data.user.email || "unknown"}`);
    }

    return { isLoggedIn, isOnboarded, isGuest, guestTrialConsumed };
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
    isGuest: result.isLoggedIn ? result.isGuest === true : false,
    guestTrialConsumed: result.isLoggedIn
      ? result.guestTrialConsumed === true
      : false,
    timestamp,
  });
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