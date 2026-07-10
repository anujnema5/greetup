"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { POST_AUTH_PATH } from "@/features/auth/lib/auth-callback-url";

import { useLandingSession } from "../hooks/use-landing-session";

/** Full accounts should not browse the marketing home — send them to the app shell. */
export function LandingAuthenticatedRedirect() {
  const router = useRouter();
  const { isLoggedIn, isGuest, isOnboarded, ready } = useLandingSession();

  useEffect(() => {
    if (!ready || !isLoggedIn || isGuest) return;

    router.replace(isOnboarded ? "/home" : POST_AUTH_PATH);
  }, [ready, isLoggedIn, isGuest, isOnboarded, router]);

  return null;
}
