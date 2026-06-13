"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import { ApiError } from "@/lib/api";
import { GUEST_TRIAL_FLOW } from "@/lib/copy/user-messages";
import { useSession } from "@/lib/auth-client";
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
  useCreateTrySession,
} from "../hooks/use-create-try-session";
import { useTrySocket } from "../hooks/use-try-socket";
import { useGuestTryStatus } from "../hooks/use-guest-try-status";
import { useTryWizard } from "../hooks/use-try-wizard";
import { TRY_SIGNUP_ROUTE } from "../constants/try-routes";
import { markTryConsumedLocally } from "../lib/try-navigation";

export function TryPage() {
  const router = useRouter();
  const createAttemptedRef = useRef(false);
  const { data: session, isPending: sessionPending } = useSession();

  useTrySocket();

  useEffect(() => {
    warmDeviceFingerprint();
  }, []);

  const createGuest = useCreateTrySession();
  const hasAuthSession = Boolean(session?.user);
  const guestSessionReady = hasAuthSession || createGuest.isSuccess;
  const {
    data: status,
    isLoading: statusLoading,
    isFetching: statusFetching,
    error: statusError,
    refetch: refetchStatus,
  } = useGuestTryStatus({ enabled: !sessionPending && guestSessionReady });

  const wizard = useTryWizard(status);

  const needsGuestSession =
    !sessionPending &&
    !hasAuthSession &&
    !createGuest.isSuccess &&
    !createGuest.isPending;

  useEffect(() => {
    if (!needsGuestSession || createAttemptedRef.current) {
      return;
    }

    createAttemptedRef.current = true;
    createGuest.mutate(undefined, {
      onSuccess: () => {
        void refetchStatus();
      },
    });
  }, [needsGuestSession, createGuest, refetchStatus]);

  useEffect(() => {
    if (!status) {
      return;
    }

    if (!status.isGuest) {
      router.replace("/home");
      return;
    }

    if (status.trialConsumed) {
      markTryConsumedLocally();
    }

    if (status.trialConsumed) {
      router.replace(TRY_SIGNUP_ROUTE);
    }
  }, [status, router]);

  const bootLoading = useMemo(() => {
    if (sessionPending) {
      return true;
    }

    if (!guestSessionReady && (createGuest.isPending || !createGuest.isError)) {
      return true;
    }

    if (guestSessionReady && (statusLoading || statusFetching) && !status) {
      return true;
    }

    return false;
  }, [
    sessionPending,
    guestSessionReady,
    createGuest.isPending,
    createGuest.isError,
    statusLoading,
    statusFetching,
    status,
  ]);

  if (bootLoading) {
    const message = !guestSessionReady
      ? GUEST_TRIAL_FLOW.loading.boot
      : GUEST_TRIAL_FLOW.loading.status;

    return <TryLoading message={message} />;
  }

  if (createGuest.isError) {
    const trialUsed = isTrySignupRequiredError(createGuest.error);

    if (trialUsed) {
      return (
        <TryGateShell>
          <SignupPrompt variant="device-used" back={{ href: "/" }} />
        </TryGateShell>
      );
    }

    return (
      <TryGateShell>
        <TryBootError
          message={getTrySessionErrorMessage(createGuest.error)}
          onRetry={() => {
            createAttemptedRef.current = false;
            createGuest.reset();
            createGuest.mutate();
          }}
          back={{ href: "/" }}
        />
      </TryGateShell>
    );
  }

  if (statusError instanceof ApiError && (statusError.status === 401 || statusError.status === 403)) {
    return (
      <TryGateShell>
        <TrySessionError
          onStartFresh={() => {
            createAttemptedRef.current = false;
            void refetchStatus();
            createGuest.mutate();
          }}
          back={{ href: "/" }}
        />
      </TryGateShell>
    );
  }

  if (!status?.isGuest) {
    return <TryLoading message={GUEST_TRIAL_FLOW.loading.redirect} />;
  }

  return (
    <TryLayout
      activeStep={wizard.activeStep}
      furthestStep={wizard.furthestStep}
      onStepSelect={wizard.goToStep}
    >
      <TryFlowStep
        activeStep={wizard.activeStep}
        displayName={status.displayName}
        trialConsumed={status.trialConsumed}
        canStartMatch={status.canStartMatch}
        matchSearchAttemptsRemaining={status.matchSearchAttemptsRemaining}
        back={wizard.back}
        vibeDraft={wizard.vibeDraft}
        onVibeDraftChange={wizard.setVibeDraft}
        onStepForward={wizard.goForward}
      />
    </TryLayout>
  );
}
