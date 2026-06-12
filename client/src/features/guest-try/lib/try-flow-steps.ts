import type { TryFlowStep } from "../types/guest-try.types";

export const TRY_WIZARD_STEPS = ["name", "prefs", "match"] as const;
export type TryWizardStep = (typeof TRY_WIZARD_STEPS)[number];

export function isTryWizardStep(step: TryFlowStep): step is TryWizardStep {
  return TRY_WIZARD_STEPS.includes(step as TryWizardStep);
}

function stepIndex(step: TryFlowStep): number {
  return isTryWizardStep(step) ? TRY_WIZARD_STEPS.indexOf(step) : -1;
}

/** Furthest wizard step the guest has unlocked (signup gate still shows match UI). */
export function resolveFurthestWizardStep(nextStep: TryFlowStep | undefined): TryWizardStep {
  if (!nextStep || nextStep === "signup") {
    return "match";
  }
  return isTryWizardStep(nextStep) ? nextStep : "name";
}

/** Step to render — signup gate maps to match so the try flow never goes blank. */
export function resolveActiveTryStep(
  viewStep: TryFlowStep | null,
  nextStep: TryFlowStep | undefined,
): TryFlowStep {
  if (viewStep) {
    return viewStep;
  }
  if (nextStep === "signup") {
    return "match";
  }
  return nextStep ?? "name";
}

export function isTryStepReachable(step: TryWizardStep, furthestStep: TryWizardStep): boolean {
  return stepIndex(step) <= stepIndex(furthestStep);
}

export function isTryStepComplete(step: TryWizardStep, furthestStep: TryWizardStep): boolean {
  return stepIndex(step) < stepIndex(furthestStep);
}

export function getNextWizardStep(step: TryWizardStep): TryWizardStep | null {
  const index = stepIndex(step);
  if (index < 0 || index >= TRY_WIZARD_STEPS.length - 1) {
    return null;
  }
  return TRY_WIZARD_STEPS[index + 1];
}
