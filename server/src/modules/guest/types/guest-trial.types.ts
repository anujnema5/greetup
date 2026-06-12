import type { GuestTrialEventType } from "@/core/database/schema";

export type GuestFlowNextStep = "name" | "prefs" | "match" | "signup";

export type GuestCallTrialStatus = {
  isGuest: boolean;
  displayName: string | null;
  hasMatchPrep: boolean;
  callTrialConsumed: boolean;
  matchSearchAttemptsUsed?: number;
  matchSearchAttemptsRemaining?: number;
  canStartMatch: boolean;
  nextStep: GuestFlowNextStep;
};

export type ConsumeGuestCallTrialInput = {
  roomId: string;
  deviceHash?: string | null;
  ipHash?: string | null;
};

export type ConsumeGuestCallTrialResult = {
  applicable: boolean;
  newlyConsumed: boolean;
  callTrialConsumed: boolean;
};

export type LogGuestTrialEventInput = {
  guestUserId: string;
  eventType: GuestTrialEventType;
  deviceHash?: string | null;
  ipHash?: string | null;
  metadata?: Record<string, unknown>;
};
