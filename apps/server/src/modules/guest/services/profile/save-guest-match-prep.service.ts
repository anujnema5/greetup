import { saveMatchPrepService } from "@/modules/profile/services/match-prep.service";
import { GuestNotAllowedError, ValidationError } from "@/shared/errors";

import type { GuestMatchPrepBody } from "../../schemas/guest-match-prep.schema";
import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import { logGuestTrialEvent } from "../audit/log-guest-trial-event.service";

/**
 * Persists temporary guest matching prefs and refreshes the Redis profile snapshot.
 * Guests always use random distance / no location (v1).
 */
export async function saveGuestMatchPrep(
  userId: string,
  body: GuestMatchPrepBody,
): Promise<void> {
  const profile = await guestProfileRepository.findByUserId(userId);
  if (!profile?.isGuest) {
    throw new GuestNotAllowedError("Only guest accounts can save guest match preferences");
  }

  if (profile.guestTrialConsumedAt != null) {
    throw new ValidationError("Match preferences cannot be changed after your free call");
  }

  await saveMatchPrepService(userId, {
    moodIds: body.moodIds,
    lookingForIds: body.lookingForIds,
    interestIds: body.interestIds,
    locationPreferenceEnabled: false,
    distancePreference: "random",
  });

  await logGuestTrialEvent({
    guestUserId: userId,
    eventType: "guest_match_prep_saved",
    deviceHash: profile.guestDeviceHash,
    ipHash: profile.guestCreatedIpHash,
    metadata: {
      moodCount: body.moodIds.length,
      lookingForCount: body.lookingForIds.length,
      interestCount: body.interestIds.length,
    },
  });
}
