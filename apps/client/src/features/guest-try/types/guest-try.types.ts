export type TryFlowStep = "name" | "prefs" | "match" | "signup";

export type TryBackTarget = { href: string } | { onClick: () => void };

export type VibePrefsDraft = {
  moodIds: string[];
  lookingForIds: string[];
  interestIds: string[];
};

export type GuestTryStatus = {
  isGuest: boolean;
  displayName: string | null;
  hasMatchPrep: boolean;
  trialConsumed: boolean;
  matchSearchAttemptsUsed?: number;
  matchSearchAttemptsRemaining?: number;
  canStartMatch: boolean;
  nextStep: TryFlowStep;
};

export type CreateTrySessionData = {
  userId: string;
  isGuest: boolean;
  callTrialConsumed: boolean;
};
