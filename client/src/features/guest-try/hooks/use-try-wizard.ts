"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getNextWizardStep,
  isTryStepComplete,
  resolveActiveTryStep,
  resolveFurthestWizardStep,
  type TryWizardStep,
} from "../lib/try-flow-steps";
import { getTryBackTarget } from "../lib/try-navigation";
import type { GuestTryStatus, TryFlowStep, VibePrefsDraft } from "../types/guest-try.types";

export function useTryWizard(status: GuestTryStatus | undefined) {
  const [viewStep, setViewStep] = useState<TryFlowStep | null>(null);
  const [vibeDraft, setVibeDraft] = useState<VibePrefsDraft | null>(null);

  const furthestStep = resolveFurthestWizardStep(status?.nextStep);
  const activeStep = resolveActiveTryStep(viewStep, status?.nextStep);

  useEffect(() => {
    setViewStep(null);
  }, [status?.nextStep]);

  const goToStep = useCallback(
    (step: TryWizardStep) => {
      if (!status) {
        return;
      }
      setViewStep(step === furthestStep ? null : step);
    },
    [furthestStep, status],
  );

  const goForward = useCallback(
    (fromStep: TryWizardStep) => {
      if (!status) {
        return;
      }

      const revisiting = viewStep === fromStep && isTryStepComplete(fromStep, furthestStep);
      const nextStep = getNextWizardStep(fromStep);

      if (revisiting && nextStep) {
        setViewStep(nextStep);
        return;
      }

      setViewStep(null);
    },
    [furthestStep, status, viewStep],
  );

  const back = useMemo(
    () => getTryBackTarget(activeStep, () => setViewStep("name"), () => setViewStep("prefs")),
    [activeStep],
  );

  return {
    activeStep,
    furthestStep,
    vibeDraft,
    setVibeDraft,
    goForward,
    goToStep,
    back,
  };
}
