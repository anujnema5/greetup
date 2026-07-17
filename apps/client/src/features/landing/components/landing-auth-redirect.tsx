"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";

import { useLandingSession } from "../hooks/use-landing-session";

/**
 * Client safety net when the edge proxy fails open on `/`.
 * Uses the same session source as landing CTAs (not useSession), so redirect
 * fires whenever the page already shows member chrome ("Go to home", greeting).
 * Guests may stay on `/`. Non-onboarded members hit `/home` and are gated there.
 */
export function LandingAuthRedirect() {
  const router = useRouter();
  const { isLoggedIn, ready: sessionReady } = useLandingSession();
  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    enabled: sessionReady && isLoggedIn,
  });

  useEffect(() => {
    if (!sessionReady || !isLoggedIn) return;
    if (guestPending) return;
    if (guestStatus?.isGuest) return;
    router.replace("/home");
  }, [sessionReady, isLoggedIn, guestPending, guestStatus?.isGuest, router]);

  return null;
}
