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

  const { data: session, isPending: sessionPending } = useSession();
  const isLoggedIn = getSessionIsLoggedIn(session);

  const { data: guestStatus, isPending: guestPending } = useGuestTryStatus({
    // Only hit guest/status when a session exists — avoids 401 noise for logged-out users.
    enabled: enabled && !sessionPending && isLoggedIn,
  });

  const isGuest = guestStatus?.isGuest === true;
  const isOnboarded = getSessionIsOnboarded(session);
  const guestReady = !isLoggedIn || !guestPending;
  const isReady = !sessionPending && guestReady;

  return {
    session,
    isGuest,
    isLoggedIn,
    isOnboarded,
    isReady,
    trialConsumed: guestStatus?.trialConsumed === true,
    /** Full account that still needs profile-setup. */
    needsOnboarding: isReady && isLoggedIn && !isGuest && !isOnboarded,
  };
}
