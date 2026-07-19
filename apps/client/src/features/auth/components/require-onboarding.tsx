"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { PageLoading } from "@/components/page-loading";
import {
  buildLoginUrl,
  POST_AUTH_PATH,
} from "@/features/auth/lib/auth-callback-url";
import {
  guestTrialLandingPath,
  isGuestSpaceMatchRoom,
  isTryRoute,
  pathMatchesPrefix,
} from "@/features/auth/lib/app-route-guards";
import { useOnboardingGate } from "@/features/auth/hooks/use-onboarding-gate";

/**
 * Client-side auth + onboarding safety net for the realtime app shell.
 * Covers stale edge-proxy cache, client navigations, and auth API timeouts.
 */
export function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const skip = isTryRoute(pathname);

  const { isGuest, isLoggedIn, needsOnboarding, isReady, trialConsumed } =
    useOnboardingGate({ enabled: !skip });

  const guestBlocked = isGuest && !isGuestSpaceMatchRoom(pathname);

  useEffect(() => {
    if (skip || !isReady) return;

    if (!isLoggedIn) {
      // Instagram-style: remember where they were headed so login can return them.
      const query = searchParams.toString();
      const returnPath = query ? `${pathname}?${query}` : pathname;
      router.replace(buildLoginUrl(returnPath));
      return;
    }

    if (guestBlocked) {
      router.replace(guestTrialLandingPath(trialConsumed));
      return;
    }

    if (needsOnboarding && !pathMatchesPrefix(pathname, POST_AUTH_PATH)) {
      router.replace(POST_AUTH_PATH);
    }
  }, [
    skip,
    isReady,
    isLoggedIn,
    guestBlocked,
    trialConsumed,
    needsOnboarding,
    pathname,
    searchParams,
    router,
  ]);

  if (skip) return <>{children}</>;
  if (!isReady || !isLoggedIn || guestBlocked) return <PageLoading />;
  // Loading (not blank) while redirecting to profile-setup — avoids white /home
  // after soft nav when session.isOnboarded is still stale.
  if (needsOnboarding) return <PageLoading />;
  return <>{children}</>;
}
