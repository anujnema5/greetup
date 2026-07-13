"use client";

import type { TryBackTarget, TryFlowStep, VibePrefsDraft } from "../../types/guest-try.types";
import type { TryWizardStep } from "../../lib/try-flow-steps";
import { MatchStep } from "./match-step";
import { NameStep } from "./name-step";
import { VibeStep } from "./vibe-step";

type TryFlowStepProps = {
  activeStep: TryFlowStep;
  displayName: string | null;
  trialConsumed: boolean;
  canStartMatch: boolean;
  matchSearchAttemptsRemaining?: number;
  back: TryBackTarget;
  vibeDraft: VibePrefsDraft | null;
  onVibeDraftChange: (draft: VibePrefsDraft) => void;
  onStepForward: (fromStep: TryWizardStep) => void;
};

export function TryFlowStep({
  activeStep,
  displayName,
  trialConsumed,
  canStartMatch,
  matchSearchAttemptsRemaining,
  back,
  vibeDraft,
  onVibeDraftChange,
  onStepForward,
}: TryFlowStepProps) {
  if (activeStep === "name") {
    return (
      <NameStep
        initialDisplayName={displayName}
        back={back}
        onForward={() => onStepForward("name")}
      />
    );
  }

  if (activeStep === "prefs") {
    return (
      <VibeStep
        draft={vibeDraft}
        onDraftChange={onVibeDraftChange}
        back={back}
        onForward={() => onStepForward("prefs")}
      />
    );
  }

  if (activeStep === "match") {
    return (
      <MatchStep
        displayName={displayName}
        trialConsumed={trialConsumed}
        canStartMatch={canStartMatch}
        matchSearchAttemptsRemaining={matchSearchAttemptsRemaining}
        back={back}
      />
    );
  }

  return null;
}
