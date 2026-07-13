import { ensureProfileSnapshotCached } from "@/modules/user/services/profile-snapshot-cache.service";
import { getMatchPrepCurrentService } from "@/modules/profile/services/match-prep.service";
import { GuestProfileIncompleteError, GuestTrialExhaustedError } from "@/shared/errors";

import { isGuestMatchPrepReady } from "../../lib/guest-match-prep-ready";
import { resolveGuestDisplayName } from "../../lib/resolve-guest-display-name";
import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import { logGuestTrialEvent } from "../audit/log-guest-trial-event.service";
import { recordGuestMatchSearchAttempt } from "./guest-match-search-retry.service";

/**
 * Ensures a guest completed name + prefs and has a cached snapshot before match search.
 * No-op for registered users.
 */
export async function assertGuestReadyForMatchSearch(userId: string): Promise<void> {
  const flags = await guestProfileRepository.findTrialFlagsByUserId(userId);
  if (!flags?.isGuest) {
    return;
  }

  if (flags.guestTrialConsumed) {
    throw new GuestTrialExhaustedError();
  }

  const profile = await guestProfileRepository.findByUserId(userId);
  if (!profile) {
    throw new GuestProfileIncompleteError("Guest profile not found");
  }

  const displayName = resolveGuestDisplayName(profile.displayName, profile.name);
  if (!displayName) {
    throw new GuestProfileIncompleteError("Add a display name before searching for a match");
  }

  const prep = await getMatchPrepCurrentService(userId);
  if (!isGuestMatchPrepReady(prep)) {
    throw new GuestProfileIncompleteError(
      "Complete your matching preferences before searching for a match",
    );
  }

  const snapshotReady = await ensureProfileSnapshotCached(userId);
  if (!snapshotReady) {
    throw new GuestProfileIncompleteError(
      "Could not prepare your profile for matching — save preferences and try again",
    );
  }

  await recordGuestMatchSearchAttempt(userId);

  await logGuestTrialEvent({
    guestUserId: userId,
    eventType: "guest_match_started",
    deviceHash: profile.guestDeviceHash,
    ipHash: profile.guestCreatedIpHash,
    metadata: {},
  });
}
