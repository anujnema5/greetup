"use client";

import {
  getSessionIsLoggedIn,
  getSessionIsOnboarded,
} from "@/features/auth/lib/session-user";
import { useGuestTryStatus } from "@/features/guest-try/hooks/use-guest-try-status";
import { useSession } from "@/lib/auth-client";

type UseOnboardingGateOptions = {
  enabled?: boolean;
};

/**
 * Shared session + guest state for onboarding redirects.
 * Guests and logged-out users are never treated as "must complete profile-setup".
 */
export function useOnboardingGate(options?: UseOnboardingGateOptions) {
  const enabled = options?.enabled ?? true;

  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    enabled,
  });
  const { data: session, isPending: sessionPending } = useSession();

  const isGuest = guestStatus?.isGuest === true;
  const isLoggedIn = getSessionIsLoggedIn(session);
  const isOnboarded = getSessionIsOnboarded(session);
  const isReady = !guestPending && !sessionPending;

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
