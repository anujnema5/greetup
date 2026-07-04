"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";

import { useLandingSession } from "../hooks/use-landing-session";

/** Full accounts should not browse the marketing home — send them to the app shell. */
export function LandingAuthenticatedRedirect() {
  const router = useRouter();
  const { isLoggedIn, ready } = useLandingSession();
  const { data: guestStatus, isPending } = useGuestTryStatus({
    enabled: ready && isLoggedIn,
  });

  useEffect(() => {
    if (!ready || !isLoggedIn || isPending) return;
    if (guestStatus?.isGuest) return;

    router.replace("/home");
  }, [ready, isLoggedIn, isPending, guestStatus?.isGuest, router]);

  return null;
}
