import type { GuestStatusApiResponse } from "../types/guest-status-api.types";
import type { GuestCallTrialStatus } from "../types/guest-trial.types";

export function toGuestStatusApiResponse(status: GuestCallTrialStatus): GuestStatusApiResponse {
  return {
    isGuest: status.isGuest,
    displayName: status.displayName,
    hasMatchPrep: status.hasMatchPrep,
    trialConsumed: status.callTrialConsumed,
    matchSearchAttemptsUsed: status.matchSearchAttemptsUsed,
    matchSearchAttemptsRemaining: status.matchSearchAttemptsRemaining,
    canStartMatch: status.canStartMatch,
    nextStep: status.nextStep,
  };
}
