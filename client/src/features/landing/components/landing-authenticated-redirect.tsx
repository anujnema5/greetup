"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { POST_AUTH_PATH } from "@/features/auth/lib/auth-callback-url";
import { useOnboardingGate } from "@/features/auth/hooks/use-onboarding-gate";
import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";

import { useLandingSession } from "../hooks/use-landing-session";

/** Full accounts should not browse the marketing home — send them to the app shell. */
export function LandingAuthenticatedRedirect() {
  const router = useRouter();
  const { isLoggedIn, ready } = useLandingSession();
  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    enabled: ready && isLoggedIn,
  });
  const { isOnboarded, isReady: onboardingReady } = useOnboardingGate({
    enabled: ready && isLoggedIn && !guestStatus?.isGuest,
  });

  useEffect(() => {
    if (!ready || !isLoggedIn || guestPending) return;
    if (guestStatus?.isGuest) return;
    if (!onboardingReady) return;

    router.replace(isOnboarded ? "/home" : POST_AUTH_PATH);
  }, [
    ready,
    isLoggedIn,
    guestPending,
    onboardingReady,
    guestStatus?.isGuest,
    isOnboarded,
    router,
  ]);

  return null;
}
