import { GuestNotAllowedError, ValidationError } from "@/shared/errors";

import { assertGuestDisplayNameValid } from "../../lib/validate-guest-display-name";
import { resolveGuestDisplayName } from "../../lib/resolve-guest-display-name";
import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import { logGuestTrialEvent } from "../audit/log-guest-trial-event.service";

export type UpdateGuestDisplayNameResult = {
  displayName: string;
};

/**
 * Sets the guest's temporary display name (synced to Better Auth `name` + `displayName`).
 * Locked only after the guest call trial is consumed.
 */
export async function updateGuestDisplayName(
  userId: string,
  rawDisplayName: string,
): Promise<UpdateGuestDisplayNameResult> {
  const profile = await guestProfileRepository.findByUserId(userId);
  if (!profile?.isGuest) {
    throw new GuestNotAllowedError("Only guest accounts can update this profile");
  }

  const displayName = assertGuestDisplayNameValid(rawDisplayName);
  const currentDisplayName = resolveGuestDisplayName(profile.displayName, profile.name);
  if (currentDisplayName === displayName) {
    return { displayName };
  }

  if (profile.guestTrialConsumedAt != null) {
    throw new ValidationError("Display name cannot be changed after your conversation");
  }

  await guestProfileRepository.updateDisplayName(userId, displayName);

  await logGuestTrialEvent({
    guestUserId: userId,
    eventType: "guest_profile_saved",
    deviceHash: profile.guestDeviceHash,
    ipHash: profile.guestCreatedIpHash,
    metadata: { displayName },
  });

  return { displayName };
}
