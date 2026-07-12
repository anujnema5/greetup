"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PageLoading } from "@/components/page-loading";
import { POST_AUTH_PATH } from "@/features/auth/lib/auth-callback-url";
import { useOnboardingGate } from "@/features/auth/hooks/use-onboarding-gate";

function shouldSkipAuthGate(pathname: string): boolean {
  return pathname === "/try" || pathname.startsWith("/try/");
}

function isOnboardingPath(pathname: string): boolean {
  return (
    pathname === POST_AUTH_PATH || pathname.startsWith(`${POST_AUTH_PATH}/`)
  );
}

/** Direct match room `/space/[roomId]` — guests may stay here (proxy + try flow). */
function isGuestAllowedRealtimePath(pathname: string): boolean {
  if (!pathname.startsWith("/space/")) return false;
  if (pathname === "/space/search" || pathname.startsWith("/space/search/")) {
    return false;
  }
  return /^\/space\/[^/]+$/.test(pathname);
}

function loginHref(pathname: string): string {
  const params = new URLSearchParams();
  params.set("redirect", pathname);
  return `/login?${params.toString()}`;
}

/**
 * Client-side auth + onboarding safety net.
 * Covers stale edge-proxy session cache, client navigations, and auth API timeouts.
 */
export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const skip = shouldSkipAuthGate(pathname);

  const { isGuest, isLoggedIn, needsOnboarding, isReady, trialConsumed } =
    useOnboardingGate({
      enabled: !skip,
    });

  useEffect(() => {
    if (skip || !isReady) return;

    if (!isLoggedIn) {
      router.replace(loginHref(pathname));
      return;
    }

    if (isGuest && !isGuestAllowedRealtimePath(pathname)) {
      router.replace(trialConsumed ? "/try/complete" : "/try");
      return;
    }

    if (needsOnboarding && !isOnboardingPath(pathname)) {
      router.replace(POST_AUTH_PATH);
    }
  }, [
    skip,
    isReady,
    isLoggedIn,
    isGuest,
    trialConsumed,
    needsOnboarding,
    pathname,
    router,
  ]);

  if (skip) {
    return <>{children}</>;
  }

  if (!isReady || !isLoggedIn) {
    return <PageLoading />;
  }

  if (isGuest && !isGuestAllowedRealtimePath(pathname)) {
    return <PageLoading />;
  }

  if (needsOnboarding) {
    return null;
  }

  return <>{children}</>;
}
