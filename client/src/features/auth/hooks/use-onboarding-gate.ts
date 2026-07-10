"use client";

import {
  getSessionIsGuest,
  getSessionIsLoggedIn,
  getSessionIsOnboarded,
} from "@/features/auth/lib/session-user";
import { useSession } from "@/lib/auth-client";

type UseOnboardingGateOptions = {
  enabled?: boolean;
};

/**
 * Shared session state for onboarding redirects.
 * Guests and logged-out users are never treated as "must complete profile-setup".
 * Guest flag comes from get-session (same payload as isOnboarded).
 */
export function useOnboardingGate(options?: UseOnboardingGateOptions) {
  const enabled = options?.enabled ?? true;

  const { data: session, isPending: sessionPending } = useSession();

  const isGuest = getSessionIsGuest(session);
  const isLoggedIn = getSessionIsLoggedIn(session);
  const isOnboarded = getSessionIsOnboarded(session);
  const isReady = !enabled || !sessionPending;

  return {
    session,
    isGuest,
    isLoggedIn,
    isOnboarded,
    isReady,
    /** Full account that still needs profile-setup. */
    needsOnboarding: isReady && isLoggedIn && !isGuest && !isOnboarded,
  };
}
