import { GuestTrialExhaustedError } from "@/shared/errors";

import { guestProfileRepository } from "../../repositories/guest-profile.repository";

/** Throws when a guest has already used their one free call trial. */
export async function assertGuestCallTrialAvailable(userId: string): Promise<void> {
  const profile = await guestProfileRepository.findByUserId(userId);
  if (!profile?.isGuest) {
    return;
  }
  if (profile.guestTrialConsumedAt != null) {
    throw new GuestTrialExhaustedError();
  }
}
