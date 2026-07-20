"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PageLoading } from "@/components/page-loading";
import {
  DEFAULT_AUTHED_PATH,
  POST_AUTH_PATH,
} from "@/features/auth/lib/auth-callback-url";
import { useOnboardingGate } from "@/features/auth/hooks/use-onboarding-gate";
import { useClientMounted } from "@/features/room/hooks/session/use-client-mounted";

/**
 * Boot gate for `/`: checks the session behind the branded G loader and sends
 * full accounts on to the app (new members → profile-setup, everyone else →
 * /home). Guests may stay on the marketing landing (same as anonymous visitors).
 * Logged-out visitors fall through to the landing page, which stays
 * server-rendered underneath for SEO.
 */
export function RootAuthGate() {
  const router = useRouter();
  // False during SSR / first paint so crawlers and logged-out users see the
  // landing markup rather than a spinner.
  const mounted = useClientMounted();
  const { isReady, isLoggedIn, isGuest, needsOnboarding, guestStatusError } =
    useOnboardingGate();

  // Confirmed full account only — unknown/failed guest status must not bounce
  // a trial user off `/` into /home or profile-setup.
  const isConfirmedMember =
    isReady && isLoggedIn && !isGuest && !guestStatusError;

  useEffect(() => {
    if (!isConfirmedMember) return;
    // Guests may browse `/` (logo / back from /try); only full accounts leave.
    router.replace(needsOnboarding ? POST_AUTH_PATH : DEFAULT_AUTHED_PATH);
  }, [isConfirmedMember, needsOnboarding, router]);

  if (!mounted) return null;
  // Cover the landing while we resolve the session and during the redirect for
  // full accounts; reveal it for guests and logged-out visitors.
  if (!isReady || isConfirmedMember) {
    return (
      <div className="fixed inset-0 z-50">
        <PageLoading />
      </div>
    );
  }
  return null;
}
