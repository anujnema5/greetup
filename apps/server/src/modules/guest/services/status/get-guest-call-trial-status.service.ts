import { getMatchPrepCurrentService } from "@/modules/profile/services/match-prep.service";

import { isGuestMatchPrepReady } from "../../lib/guest-match-prep-ready";
import { resolveGuestDisplayName } from "../../lib/resolve-guest-display-name";
import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import type { GuestCallTrialStatus } from "../../types/guest-trial.types";
import {
  getGuestMatchSearchAttemptsRemaining,
  getGuestMatchSearchAttemptsUsed,
} from "../matching/guest-match-search-retry.service";

function nonGuestStatus(displayName: string | null = null): GuestCallTrialStatus {
  return {
    isGuest: false,
    displayName,
    hasMatchPrep: false,
    callTrialConsumed: false,
    canStartMatch: false,
    nextStep: "signup",
  };
}

export async function getGuestCallTrialStatus(userId: string): Promise<GuestCallTrialStatus> {
  const profile = await guestProfileRepository.findByUserId(userId);
  if (!profile) {
    // Registered users may not have a profile row until profile-setup step 1 saves.
    return nonGuestStatus();
  }

  const displayName = resolveGuestDisplayName(profile.displayName, profile.name);
  const callTrialConsumed = profile.guestTrialConsumedAt != null;

  if (!profile.isGuest) {
    return nonGuestStatus(displayName);
  }

  const prep = await getMatchPrepCurrentService(userId);
  const matchPrepReady = isGuestMatchPrepReady(prep);
  const matchSearchAttemptsUsed = await getGuestMatchSearchAttemptsUsed(userId);
  const matchSearchAttemptsRemaining = getGuestMatchSearchAttemptsRemaining(matchSearchAttemptsUsed);

  let nextStep: GuestCallTrialStatus["nextStep"] = "match";
  if (callTrialConsumed) {
    nextStep = "signup";
  } else if (!displayName) {
    nextStep = "name";
  } else if (!matchPrepReady) {
    nextStep = "prefs";
  }

  return {
    isGuest: true,
    displayName,
    hasMatchPrep: matchPrepReady,
    callTrialConsumed,
    matchSearchAttemptsUsed,
    matchSearchAttemptsRemaining,
    canStartMatch: !callTrialConsumed && Boolean(displayName) && matchPrepReady,
    nextStep,
  };
}
