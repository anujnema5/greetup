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
 * Guest-status fetch failures also must not fail open into profile-setup.
 */
export function useOnboardingGate(options?: UseOnboardingGateOptions) {
  const enabled = options?.enabled ?? true;

  const { data: session, isPending: sessionPending } = useSession();
  const isLoggedIn = getSessionIsLoggedIn(session);

  const {
    data: guestStatus,
    isPending: guestPending,
    isError: guestStatusError,
  } = useGuestTryStatus({
    enabled: enabled && !sessionPending && isLoggedIn,
  });

  const isGuest = guestStatus?.isGuest === true;
  const isOnboarded = getSessionIsOnboarded(session);
  const isReady = !sessionPending && (!isLoggedIn || !guestPending);
  /** Confirmed full member — not guest, and status did not fail open. */
  const isConfirmedMember =
    isReady && isLoggedIn && !isGuest && !guestStatusError;

  return {
    session,
    isGuest,
    isLoggedIn,
    isOnboarded,
    isReady,
    guestStatusError,
    trialConsumed: guestStatus?.trialConsumed === true,
    needsOnboarding: isConfirmedMember && !isOnboarded,
  };
}
