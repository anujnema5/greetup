import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import type { GuestAuthContext } from "../../types/guest-auth-context.types";

const DEFAULT_CONTEXT: GuestAuthContext = {
  isGuest: false,
  guestTrialConsumed: false,
};

/** Loads guest call-trial flags for auth middleware (minimal columns, no joins). */
export async function resolveGuestAuthContext(userId: string): Promise<GuestAuthContext> {
  const flags = await guestProfileRepository.findTrialFlagsByUserId(userId);
  if (!flags) {
    return DEFAULT_CONTEXT;
  }
  return flags;
}
