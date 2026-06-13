"use client";

import { useEffect } from "react";

import { GUEST_TRIAL_FLOW } from "@/lib/copy/user-messages";
import { warmDeviceFingerprint } from "@/lib/device-fingerprint";

import { SignupPrompt } from "../components/gates/signup-prompt";
import { TryBootError } from "../components/gates/try-boot-error";
import { TrySessionError } from "../components/gates/try-session-error";
import { TryFlowStep } from "../components/steps/try-flow-step";
import { TryGateShell } from "../components/layout/try-gate-shell";
import { TryLayout } from "../components/layout/try-layout";
import { TryLoading } from "../components/layout/try-loading";
import {
  getTrySessionErrorMessage,
  isTrySignupRequiredError,
} from "../hooks/use-create-try-session";
import { useTryBoot } from "../hooks/use-try-boot";
import { useTrySocket } from "../hooks/use-try-socket";
import { useTryWizard } from "../hooks/use-try-wizard";

export function TryPage() {
  const boot = useTryBoot();
  const wizard = useTryWizard(boot.kind === "ready" ? boot.status : undefined);

  useTrySocket();

  useEffect(() => {
    warmDeviceFingerprint();
  }, []);

  switch (boot.kind) {
    case "loading":
      return <TryLoading message={boot.message} />;

    case "create-error": {
      if (isTrySignupRequiredError(boot.error)) {
        return (
          <TryGateShell>
            <SignupPrompt variant="device-used" back={{ href: "/" }} />
          </TryGateShell>
        );
      }

      return (
        <TryGateShell>
          <TryBootError
            message={getTrySessionErrorMessage(boot.error)}
            onRetry={boot.onRetry}
            back={{ href: "/" }}
          />
        </TryGateShell>
      );
    }

    case "session-error":
      return (
        <TryGateShell>
          <TrySessionError onStartFresh={boot.onStartFresh} back={{ href: "/" }} />
        </TryGateShell>
      );

    case "redirecting":
      return <TryLoading message={GUEST_TRIAL_FLOW.loading.redirect} />;

    case "ready":
      return (
        <TryLayout
          activeStep={wizard.activeStep}
          furthestStep={wizard.furthestStep}
          onStepSelect={wizard.goToStep}
        >
          <TryFlowStep
            activeStep={wizard.activeStep}
            displayName={boot.status.displayName}
            trialConsumed={boot.status.trialConsumed}
            canStartMatch={boot.status.canStartMatch}
            matchSearchAttemptsRemaining={boot.status.matchSearchAttemptsRemaining}
            back={wizard.back}
            vibeDraft={wizard.vibeDraft}
            onVibeDraftChange={wizard.setVibeDraft}
            onStepForward={wizard.goForward}
          />
        </TryLayout>
      );
  }
}
