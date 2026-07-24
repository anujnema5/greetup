import { auth } from "@/core/auth/auth";
import { hasBetterAuthSessionCookie } from "@/core/auth/session-cookie";

import { resolveGuestDisplayName } from "../../lib/resolve-guest-display-name";
import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import type { GuestSignupMergeContext } from "../../types/guest-signup.types";

/**
 * Returns merge context when the request has a Better Auth session for an unconverted guest.
 * Without a session cookie this is a no-op (safe for the public signup-context probe).
 */
export async function resolveGuestSignupMergeContext(
  headers: Headers | undefined | null,
): Promise<GuestSignupMergeContext | null> {
  if (!headers) {
    return null;
  }

  if (!hasBetterAuthSessionCookie(headers.get("cookie"))) {
    return null;
  }

  const session = await auth.api.getSession({ headers });
  if (!session?.user?.id || !session.session?.id) {
    return null;
  }

  const profile = await guestProfileRepository.findByUserId(session.user.id);
  if (!profile?.isGuest || profile.guestConvertedAt != null) {
    return null;
  }

  return {
    guestUserId: session.user.id,
    guestSessionId: session.session.id,
    trialConsumed: profile.guestTrialConsumedAt != null,
    displayName: resolveGuestDisplayName(profile.displayName, profile.name),
    deviceHash: profile.guestDeviceHash,
    ipHash: profile.guestCreatedIpHash,
  };
}
