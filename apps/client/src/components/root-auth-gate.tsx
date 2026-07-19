"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageLoading } from "@/components/page-loading";
import {
  DEFAULT_AUTHED_PATH,
  POST_AUTH_PATH,
} from "@/features/auth/lib/auth-callback-url";
import { guestTrialLandingPath } from "@/features/auth/lib/app-route-guards";
import { useOnboardingGate } from "@/features/auth/hooks/use-onboarding-gate";
import { useClientMounted } from "@/features/room/hooks/session/use-client-mounted";

/**
 * Boot gate for `/`: checks the session behind the branded G loader and sends
 * signed-in visitors on to the app (guests → trial, new members → profile-setup,
 * everyone else → /home). Logged-out visitors fall through to the landing page,
 * which stays server-rendered underneath for SEO.
 */
export function RootAuthGate() {
  const router = useRouter();
  // False during SSR / first paint so crawlers and logged-out users see the
  // landing markup rather than a spinner.
  const mounted = useClientMounted();
  const { isReady, isLoggedIn, isGuest, needsOnboarding, trialConsumed } =
    useOnboardingGate();

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;
    if (isGuest) {
      router.replace(guestTrialLandingPath(trialConsumed));
      return;
    }
    router.replace(needsOnboarding ? POST_AUTH_PATH : DEFAULT_AUTHED_PATH);
  }, [isReady, isLoggedIn, isGuest, needsOnboarding, trialConsumed, router]);

  if (!mounted) return null;
  // Cover the landing while we resolve the session and during the redirect for
  // signed-in users; reveal it once we've confirmed the visitor is logged out.
  if (!isReady || isLoggedIn) {
    return (
      <div className="fixed inset-0 z-50">
        <PageLoading />
      </div>
    );
  }
  return null;
}
