import { getMatchPrepCurrentService } from "@/modules/profile/services/match-prep.service";
import { NotFoundError } from "@/shared/errors";

import { isGuestMatchPrepReady } from "../../lib/guest-match-prep-ready";
import { resolveGuestDisplayName } from "../../lib/resolve-guest-display-name";
import { guestProfileRepository } from "../../repositories/guest-profile.repository";
import type { GuestCallTrialStatus } from "../../types/guest-trial.types";
import {
  getGuestMatchSearchAttemptsRemaining,
  getGuestMatchSearchAttemptsUsed,
} from "../matching/guest-match-search-retry.service";

export async function getGuestCallTrialStatus(userId: string): Promise<GuestCallTrialStatus> {
  const profile = await guestProfileRepository.findByUserId(userId);
  if (!profile) {
    throw new NotFoundError("Profile not found");
  }

  const displayName = resolveGuestDisplayName(profile.displayName, profile.name);
  const callTrialConsumed = profile.guestTrialConsumedAt != null;

  if (!profile.isGuest) {
    return {
      isGuest: false,
      displayName,
      hasMatchPrep: false,
      callTrialConsumed: false,
      canStartMatch: false,
      nextStep: "signup",
    };
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
