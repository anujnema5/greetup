/** Single source of truth for app paths — used by proxy, nav, and redirects. */

export const APP_ROUTES = {
  home: "/home",
  explore: "/explore",
  connections: "/connections",
  messages: "/messages",
  profile: "/profile",
  settings: "/settings",
  circles: "/circles",
  circleSearch: "/circle/search",
  profileSetup: "/profile-setup",
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
} as const;

export const PUBLIC_ROUTES = [
  APP_ROUTES.login,
  APP_ROUTES.register,
  APP_ROUTES.forgotPassword,
  APP_ROUTES.resetPassword,
  APP_ROUTES.verifyEmail,
] as const;

/** Requires auth (session). */
export const PROTECTED_ROUTE_PREFIXES = [
  APP_ROUTES.home,
  APP_ROUTES.profile,
  APP_ROUTES.settings,
  APP_ROUTES.profileSetup,
  APP_ROUTES.explore,
  APP_ROUTES.connections,
  APP_ROUTES.messages,
  APP_ROUTES.circles,
  "/circle",
  "/u",
] as const;

/** Requires auth + completed onboarding. */
export const ONBOARDING_REQUIRED_ROUTE_PREFIXES = [
  APP_ROUTES.home,
  APP_ROUTES.profile,
  APP_ROUTES.settings,
  APP_ROUTES.explore,
  APP_ROUTES.connections,
  APP_ROUTES.messages,
  APP_ROUTES.circles,
  "/circle",
  "/u",
] as const;

export const ONBOARDING_ROUTE = APP_ROUTES.profileSetup;

/** Marketing / legal pages — no auth gate. */
export const COMMON_ROUTE_PREFIXES = [
  "/about",
  "/contact",
  "/pricing",
  "/features",
  "/blog",
  "/help",
  "/faq",
  "/terms",
  "/privacy",
] as const;

export function matchesRoutePrefix(
  pathname: string,
  prefixes: readonly string[],
): boolean {
  return prefixes.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route),
  );
}

export function isPublicRoute(pathname: string): boolean {
  return (PUBLIC_ROUTES as readonly string[]).includes(pathname);
}

export function isProtectedRoute(pathname: string): boolean {
  return matchesRoutePrefix(pathname, PROTECTED_ROUTE_PREFIXES);
}

export function isOnboardingRequiredRoute(pathname: string): boolean {
  return matchesRoutePrefix(pathname, ONBOARDING_REQUIRED_ROUTE_PREFIXES);
}

export function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE;
}

export function isCommonRoute(pathname: string): boolean {
  if ((COMMON_ROUTE_PREFIXES as readonly string[]).includes(pathname)) {
    return true;
  }

  return COMMON_ROUTE_PREFIXES.some((route) =>
    pathname.startsWith(`${route}/`),
  );
}
