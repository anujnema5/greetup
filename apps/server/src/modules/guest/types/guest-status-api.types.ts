import type { GuestFlowNextStep } from "./guest-trial.types";

/** Public JSON shape for `GET /guest/status`. */
export type GuestStatusApiResponse = {
  isGuest: boolean;
  displayName: string | null;
  hasMatchPrep: boolean;
  trialConsumed: boolean;
  matchSearchAttemptsUsed?: number;
  matchSearchAttemptsRemaining?: number;
  canStartMatch: boolean;
  nextStep: GuestFlowNextStep;
};
