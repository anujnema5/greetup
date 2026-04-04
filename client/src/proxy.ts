import { NextRequest, NextResponse } from "next/server";
import { API_BASE_URL } from "./shared/constants";

// ==================== ROUTES CONFIGURATION ====================
const PUBLIC_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const PROTECTED_ROUTES = [
  "/",
  "/profile",
  "/settings",
  "/profile-setup",
];

/** Routes that require onboarding to be complete */
const ONBOARDING_REQUIRED_ROUTES = ["/", "/profile", "/settings"];

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
];

// ==================== CACHE CONFIGURATION ====================
interface CacheEntry {
  isLoggedIn: boolean;
  isOnboarded?: boolean;
  timestamp: number;
  inProgress?: Promise<boolean>;
}

const sessionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 10 * 1000; // 10 seconds
const MAX_CACHE_SIZE = 500; // Prevent cache poisoning

// ==================== MAIN PROXY FUNCTION ====================
// ⭐ Changed from 'middleware' to 'proxy'
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip proxy for static files and API routes
  if (shouldSkipProxy(pathname)) {
    return NextResponse.next();
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

  // Redirect logged-in users away from public routes
  if (isLoggedIn && PUBLIC_ROUTES.includes(pathname)) {
    const isOnboarded = await checkOnboardingWithCache(req, pathname);
    const redirectUrl = isOnboarded ? "/" : "/profile-setup";
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  // Redirect non-logged-in users away from protected routes
  if (!isLoggedIn && isProtectedRoute(pathname)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect onboarded users away from profile-setup (they're done)
  if (isLoggedIn && pathname === "/profile-setup") {
    const isOnboarded = await checkOnboardingWithCache(req, pathname);
    if (isOnboarded) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Redirect logged-in but not-onboarded users away from onboarding-required routes
  if (
    isLoggedIn &&
    isOnboardingRequiredRoute(pathname) &&
    pathname !== "/profile-setup"
  ) {
    const isOnboarded = await checkOnboardingWithCache(req, pathname);
    if (!isOnboarded) {
      return NextResponse.redirect(new URL("/profile-setup", req.url));
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

function isCommonRoute(pathname: string): boolean {
  if (COMMON_ROUTES.includes(pathname)) {
    return true;
  }

  return COMMON_ROUTES.some((route) => {
    if (route === "/") return pathname === "/";
    return pathname.startsWith(route + "/");
  });
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

async function checkAuthWithCache(req: NextRequest): Promise<boolean> {
  cleanExpiredCache();

  const sessionToken = req.cookies.get("better-auth.session_token")?.value;

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
        return await cached.inProgress;
      } catch {
        console.warn("[Auth] In-progress request failed, retrying");
      }
    }
    return cached.isLoggedIn;
  }

  const authCheckPromise = performAuthCheck(req, sessionToken);

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
    const isLoggedIn = await authCheckPromise;

    sessionCache.set(sessionToken, {
      isLoggedIn,
      timestamp: now,
    });

    return isLoggedIn;
  } catch (error) {
    console.error("[Auth] Check failed:", error);
    sessionCache.delete(sessionToken);
    return false;
  }
}

async function performAuthCheck(
  req: NextRequest,
  sessionToken: string
): Promise<boolean> {
  const apiBaseUrl = API_BASE_URL;

  if (!apiBaseUrl) {
    console.error("[Auth] NEXT_PUBLIC_API_BASE_URL is not defined in environment variables");
    throw new Error("API base URL not configured");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

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
        return false;
      }

      console.error(`[Auth] API returned status ${res.status}`);
      throw new Error(`Auth check failed with status ${res.status}`);
    }

    const data = await res.json();
    const isLoggedIn = !!data?.user;

    if (isLoggedIn) {
      console.log(`[Auth] User authenticated: ${data.user.id || data.user.email || "unknown"}`);
    }

    return isLoggedIn;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("[Auth] Check timeout after 3 seconds");
      } else {
        console.error("[Auth] Check error:", error.message);
      }
    }

    throw error;
  }
}

// ==================== ONBOARDING CHECK ====================

async function checkOnboardingWithCache(
  req: NextRequest,
  pathname?: string
): Promise<boolean> {
  const sessionToken = req.cookies.get("better-auth.session_token")?.value;
  if (!sessionToken) return false;

  const cached = sessionCache.get(sessionToken);
  const now = Date.now();
  // Skip cache when navigating to dashboard with cached false – user may have just completed onboarding
  const skipCacheForFreshCheck =
    pathname === "/" && cached?.isOnboarded === false;
  if (
    !skipCacheForFreshCheck &&
    cached?.isOnboarded !== undefined &&
    now - cached.timestamp < CACHE_TTL
  ) {
    return cached.isOnboarded;
  }

  const apiBaseUrl = API_BASE_URL;
  if (!apiBaseUrl) return false;

  try {
    const res = await fetch(`${apiBaseUrl}/profile/onboarding-status`, {
      method: "GET",
      headers: {
        cookie: req.headers.get("cookie") ?? "",
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!res.ok) return false;
    const data = await res.json();
    const isOnboarded = !!data?.data?.isOnboarded;

    const entry = cached ?? { isLoggedIn: true, timestamp: now };
    entry.isOnboarded = isOnboarded;
    entry.timestamp = now;
    sessionCache.set(sessionToken, entry);
    return isOnboarded;
  } catch {
    return false;
  }
}

// ==================== PROXY CONFIG ====================
// ⭐ Note: In Next.js 16, the config export stays the same
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};